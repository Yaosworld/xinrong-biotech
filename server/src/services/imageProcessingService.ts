import path from 'path'
import sharp from 'sharp'

export type ImageProcessingProfileKey =
  | 'avatar'
  | 'brand-cert'
  | 'brand-logo'
  | 'common'
  | 'home-banner'
  | 'product-category'
  | 'product-detail'
  | 'promotion-cover'
  | 'promotion-poster'
  | 'site-config'

type OutputMode = 'preserve' | 'webp'

interface ImageProcessingProfile {
  mode: OutputMode
  maxWidth?: number
  maxHeight?: number
  quality: number
}

export interface ImageProcessingInput {
  buffer: Buffer
  originalName: string
  mimeType: string
}

export interface ImageProcessingResult {
  buffer: Buffer
  extension: string
  mimeType: string
  originalName: string
  transformed: boolean
}

const PROFILES: Record<ImageProcessingProfileKey, ImageProcessingProfile> = {
  avatar: {
    mode: 'webp',
    maxWidth: 512,
    maxHeight: 512,
    quality: 80
  },
  'brand-cert': {
    mode: 'webp',
    maxWidth: 1600,
    quality: 84
  },
  'brand-logo': {
    mode: 'webp',
    maxWidth: 900,
    maxHeight: 900,
    quality: 86
  },
  common: {
    mode: 'preserve',
    maxWidth: 1600,
    quality: 86
  },
  'home-banner': {
    mode: 'webp',
    maxWidth: 1920,
    quality: 82
  },
  'product-category': {
    mode: 'webp',
    maxWidth: 1400,
    quality: 82
  },
  'product-detail': {
    mode: 'webp',
    maxWidth: 1800,
    quality: 84
  },
  'promotion-cover': {
    mode: 'webp',
    maxWidth: 1600,
    quality: 82
  },
  'promotion-poster': {
    mode: 'webp',
    maxWidth: 1800,
    quality: 84
  },
  'site-config': {
    mode: 'preserve',
    maxWidth: 1400,
    quality: 88
  }
}

function replaceExtension(filename: string, extension: string): string {
  const ext = path.extname(filename)
  const baseName = ext ? path.basename(filename, ext) : filename
  return `${baseName}${extension}`
}

function getProfile(key: ImageProcessingProfileKey): ImageProcessingProfile {
  return PROFILES[key]
}

function getFallbackResult(input: ImageProcessingInput): ImageProcessingResult {
  const extension = path.extname(input.originalName).toLowerCase() || '.png'
  return {
    buffer: input.buffer,
    extension,
    mimeType: input.mimeType,
    originalName: input.originalName,
    transformed: false
  }
}

export function getProfileForUploadCategory(category: string): ImageProcessingProfileKey {
  const mapping: Record<string, ImageProcessingProfileKey> = {
    'brand-cert': 'brand-cert',
    'brand-logo': 'brand-logo',
    avatar: 'avatar',
    common: 'common',
    'home-banner': 'home-banner',
    'product-category': 'product-category',
    'product-detail': 'product-detail',
    'promotion-cover': 'promotion-cover',
    'promotion-poster': 'promotion-poster',
    'site-config': 'site-config'
  }

  return mapping[category] || 'common'
}

export function getProfileForImageRoute(imageDir: string, imageType?: string): ImageProcessingProfileKey {
  switch (imageDir) {
    case 'images/avatars':
      return 'avatar'
    case 'images/brands':
      return imageType === 'certificate' ? 'brand-cert' : 'brand-logo'
    case 'images/common':
      return 'common'
    case 'images/home':
      return 'home-banner'
    case 'images/products':
      return 'product-category'
    case 'images/promotions':
      return imageType === 'poster' ? 'promotion-poster' : 'promotion-cover'
    case 'images/site':
      return 'site-config'
    default:
      return 'common'
  }
}

export async function optimizeUploadedImage(
  input: ImageProcessingInput,
  profileKey: ImageProcessingProfileKey
): Promise<ImageProcessingResult> {
  const profile = getProfile(profileKey)
  const extension = path.extname(input.originalName).toLowerCase()

  if (extension === '.gif') {
    return getFallbackResult(input)
  }

  try {
    let pipeline = sharp(input.buffer, { animated: false }).rotate()

    if (profile.maxWidth || profile.maxHeight) {
      pipeline = pipeline.resize({
        width: profile.maxWidth,
        height: profile.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    if (profile.mode === 'webp') {
      const buffer = await pipeline.webp({ quality: profile.quality }).toBuffer()
      return {
        buffer,
        extension: '.webp',
        mimeType: 'image/webp',
        originalName: replaceExtension(input.originalName, '.webp'),
        transformed: true
      }
    }

    switch (extension) {
      case '.jpg':
      case '.jpeg': {
        const buffer = await pipeline.jpeg({ quality: profile.quality, mozjpeg: true }).toBuffer()
        return {
          buffer,
          extension: '.jpg',
          mimeType: 'image/jpeg',
          originalName: replaceExtension(input.originalName, '.jpg'),
          transformed: true
        }
      }
      case '.png': {
        const buffer = await pipeline.png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
        return {
          buffer,
          extension: '.png',
          mimeType: 'image/png',
          originalName: replaceExtension(input.originalName, '.png'),
          transformed: true
        }
      }
      case '.webp': {
        const buffer = await pipeline.webp({ quality: profile.quality }).toBuffer()
        return {
          buffer,
          extension: '.webp',
          mimeType: 'image/webp',
          originalName: replaceExtension(input.originalName, '.webp'),
          transformed: true
        }
      }
      default:
        return getFallbackResult(input)
    }
  } catch (error) {
    console.warn(
      `[imageProcessingService] 图片优化失败，保留原图: ${input.originalName}`,
      error
    )
    return getFallbackResult(input)
  }
}
