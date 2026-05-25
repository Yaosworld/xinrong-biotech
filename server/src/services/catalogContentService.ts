import fs from 'fs'
import path from 'path'
import db from '../db'
import { categoryService } from './categoryService'
import { applyListQuery } from './contentQueryUtils'
import { catalogStructuredStorageService } from './catalogStructuredStorageService'
import type { QueryOptions } from './contentModels'
import { versionedContentRepository } from './versionedContentRepository'

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads')

function invalidateRelatedCaches(contentType: string) {
  if (contentType === 'product' || contentType === 'category') {
    categoryService.invalidateCache()
  }
}

function materializeStructuredContent(contentType: string, contentKeys: string[]) {
  if (contentKeys.length === 0) {
    invalidateRelatedCaches(contentType)
    return
  }

  const rows = versionedContentRepository.getRawContentsByKeys(contentType, contentKeys)
  const rowKeySet = new Set(rows.map(row => row.content_key))

  catalogStructuredStorageService.upsertManyFromContentRows(contentType, rows)

  const deletedOrMissingKeys = contentKeys.filter(key => !rowKeySet.has(key) || rows.some(row => row.content_key === key && row.status === 'deleted'))
  if (deletedOrMissingKeys.length > 0) {
    catalogStructuredStorageService.deleteByContentKeys(contentType, deletedOrMissingKeys)
  }

  invalidateRelatedCaches(contentType)
}

function getPromotionImageUrl(filename: string, imageType: 'covers' | 'posters'): string {
  const uploadPath = path.join(UPLOAD_BASE, 'images/promotions', imageType, filename)
  if (fs.existsSync(uploadPath)) {
    return `/uploads/images/promotions/${imageType}/${filename}`
  }
  return `/images/promotions/${imageType}/${filename}`
}

function enrichPromotionData(promotions: any[]): any[] {
  const rows = db.queryAll('SELECT id, filename, image_type FROM promotion_images')
  const imageMap = new Map<number, { filename: string; imageType: string }>()
  rows.forEach((row: any) => imageMap.set(row.id, { filename: row.filename, imageType: row.image_type }))

  return promotions.map(promotion => {
    let cover_url = promotion.cover_url || ''
    let poster_url = promotion.poster_url || ''

    if (promotion.coverId) {
      const coverInfo = imageMap.get(promotion.coverId)
      if (coverInfo) {
        cover_url = getPromotionImageUrl(coverInfo.filename, 'covers')
      }
    }

    if (promotion.posterId) {
      const posterInfo = imageMap.get(promotion.posterId)
      if (posterInfo) {
        poster_url = getPromotionImageUrl(posterInfo.filename, 'posters')
      }
    }

    return {
      ...promotion,
      cover_url,
      poster_url
    }
  })
}

function getPublishedData(contentType: string): any[] {
  if (contentType === 'category') {
    return categoryService.getAllPublished()
  }

  const data = catalogStructuredStorageService.listPublishedData(contentType)
  if (contentType === 'promotion') {
    return enrichPromotionData(data)
  }

  return data
}

function getPublishedOne(contentType: string, contentKey: string): any | null {
  if (contentType === 'category') {
    return categoryService.getAllPublished().find(item => String(item.id) === String(contentKey)) || null
  }

  const item = catalogStructuredStorageService.getPublishedOne(contentType, contentKey)
  if (!item) {
    return null
  }

  if (contentType === 'promotion') {
    return enrichPromotionData([item])[0] || null
  }

  return item
}

function getFilterOptions(contentType: string) {
  const data = getPublishedData(contentType)
  const brands = new Set<string>()
  const categories = new Set<string>()

  data.forEach(item => {
    if (item.brand) brands.add(item.brand)
    if (item.categoryId) categories.add(item.categoryId)
  })

  return {
    brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    categories: Array.from(categories).sort(),
    total: data.length
  }
}

export const catalogContentService = {
  supports(contentType: string) {
    return catalogStructuredStorageService.supports(contentType)
  },

  getPublishedList(contentType: string, options: QueryOptions = {}) {
    return applyListQuery(getPublishedData(contentType), options)
  },

  getPublishedOne,

  getAdminList(contentType: string, options: QueryOptions = {}) {
    return versionedContentRepository.getAdminList(contentType, options)
  },

  getOne(contentType: string, contentKey: string) {
    return versionedContentRepository.getAdminItem(contentType, contentKey)
  },

  getFilterOptions,

  getVersions(contentType: string, contentKey: string) {
    return versionedContentRepository.getVersions(contentType, contentKey)
  },

  saveDraft(contentType: string, contentKey: string, data: any) {
    versionedContentRepository.saveDraft(contentType, contentKey, data)
    materializeStructuredContent(contentType, [contentKey])
  },

  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    versionedContentRepository.batchSaveDraft(contentType, items)
    materializeStructuredContent(contentType, items.map(item => item.key))
  },

  delete(contentType: string, contentKey: string) {
    versionedContentRepository.softDelete(contentType, contentKey)
    materializeStructuredContent(contentType, [contentKey])
  },

  batchDelete(contentType: string, contentKeys: string[]) {
    const deletedCount = versionedContentRepository.batchSoftDelete(contentType, contentKeys)
    materializeStructuredContent(contentType, contentKeys)
    return deletedCount
  },

  publish(contentType: string, contentKey: string, changeSummary?: string) {
    const version = versionedContentRepository.publish(contentType, contentKey, changeSummary)
    materializeStructuredContent(contentType, [contentKey])
    return version
  },

  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string) {
    const publishedCount = versionedContentRepository.batchPublish(contentType, contentKeys, changeSummary)
    materializeStructuredContent(contentType, contentKeys)
    return publishedCount
  },

  rollback(contentType: string, contentKey: string, version: number) {
    versionedContentRepository.rollback(contentType, contentKey, version)
    materializeStructuredContent(contentType, [contentKey])
  }
}
