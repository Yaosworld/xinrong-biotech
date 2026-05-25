/**
 * 批量优化现有首页图和产品分类图。
 *
 * 目标：
 * 1. 处理 uploads 和 public 中现有的大图
 * 2. 优先转换为 WebP，控制宽度，减少体积
 * 3. 同步更新数据库中的图片文件名/路径引用
 * 4. 同步更新 public/data/home-config.json 中的旧 URL
 *
 * 使用方法：
 *   node scripts/optimize_existing_images.js
 */

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const initSqlJs = require('sql.js')

const projectRoot = path.join(__dirname, '../..')
const dbPath = path.join(__dirname, '../data/cms.db')
const publicDataHomeConfigPath = path.join(projectRoot, 'public/data/home-config.json')

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const TARGETS = [
  {
    key: 'home',
    label: '首页 Banner',
    minBytes: 300 * 1024,
    maxWidth: 1920,
    quality: 82,
    directories: [
      path.join(projectRoot, 'server/uploads/images/home'),
      path.join(projectRoot, 'public/images/home')
    ]
  },
  {
    key: 'products',
    label: '产品分类图',
    minBytes: 300 * 1024,
    maxWidth: 1400,
    quality: 82,
    directories: [
      path.join(projectRoot, 'server/uploads/images/products'),
      path.join(projectRoot, 'public/images/products')
    ]
  }
]

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return []
  return fs.readdirSync(dirPath)
    .map(name => path.join(dirPath, name))
    .filter(fullPath => {
      if (!fs.statSync(fullPath).isFile()) return false
      const ext = path.extname(fullPath).toLowerCase()
      return IMAGE_EXTENSIONS.has(ext)
    })
}

function replaceUrlFilename(url, oldName, newName) {
  if (typeof url !== 'string' || !url.endsWith(`/${oldName}`)) return url
  return `${url.slice(0, -oldName.length)}${newName}`
}

async function optimizeToWebp(filePath, profile) {
  const originalBuffer = fs.readFileSync(filePath)
  const originalBytes = originalBuffer.length
  const originalExt = path.extname(filePath).toLowerCase()
  const basename = path.basename(filePath, originalExt)
  const targetFilename = `${basename}.webp`
  const targetPath = path.join(path.dirname(filePath), targetFilename)

  if (originalExt === '.gif') {
    return { skipped: true, reason: 'gif-not-supported' }
  }

  if (originalBytes < profile.minBytes) {
    return { skipped: true, reason: 'below-threshold' }
  }

  if (targetPath !== filePath && fs.existsSync(targetPath)) {
    return { skipped: true, reason: 'target-exists' }
  }

  const optimizedBuffer = await sharp(originalBuffer)
    .rotate()
    .resize({
      width: profile.maxWidth,
      fit: 'inside',
      withoutEnlargement: true
    })
    .webp({ quality: profile.quality })
    .toBuffer()

  const optimizedBytes = optimizedBuffer.length
  const improvementRatio = 1 - (optimizedBytes / originalBytes)

  if (optimizedBytes >= originalBytes || improvementRatio < 0.02) {
    return { skipped: true, reason: 'not-enough-improvement' }
  }

  const tempPath = `${targetPath}.tmp`
  fs.writeFileSync(tempPath, optimizedBuffer)

  if (targetPath === filePath) {
    fs.renameSync(tempPath, targetPath)
  } else {
    fs.renameSync(tempPath, targetPath)
    fs.unlinkSync(filePath)
  }

  return {
    skipped: false,
    oldName: path.basename(filePath),
    newName: targetFilename,
    oldPath: filePath,
    newPath: targetPath,
    originalBytes,
    optimizedBytes,
    savedBytes: originalBytes - optimizedBytes
  }
}

function updateImageTable(database, tableName, dirKey, filenameMap) {
  for (const [oldName, newName] of filenameMap.entries()) {
    const newRelativePath = `images/${dirKey}/${newName}`
    database.run(
      `UPDATE ${tableName} SET filename = ?, original_name = ?, path = ? WHERE filename = ?`,
      [newName, newName, newRelativePath, oldName]
    )
  }
}

function updateCategoryContents(database, filenameMap) {
  const result = database.exec(`
    SELECT id, draft_data, published_data
    FROM contents
    WHERE content_type = 'category'
  `)

  if (!result.length) return 0

  const rows = result[0].values
  let updatedCount = 0

  for (const [id, draftData, publishedData] of rows) {
    let changed = false
    let nextDraft = draftData
    let nextPublished = publishedData

    const patchImageNameField = (raw) => {
      if (!raw) return raw
      try {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.imageName && filenameMap.has(parsed.imageName)) {
          parsed.imageName = filenameMap.get(parsed.imageName)
          changed = true
          return JSON.stringify(parsed)
        }
      } catch {}
      return raw
    }

    nextDraft = patchImageNameField(draftData)
    nextPublished = patchImageNameField(publishedData)

    if (changed) {
      database.run(
        `UPDATE contents SET draft_data = ?, published_data = ? WHERE id = ?`,
        [nextDraft, nextPublished, id]
      )
      updatedCount++
    }
  }

  for (const [oldName, newName] of filenameMap.entries()) {
    database.run(
      `UPDATE catalog_categories
       SET draft_image_name = CASE WHEN draft_image_name = ? THEN ? ELSE draft_image_name END,
           published_image_name = CASE WHEN published_image_name = ? THEN ? ELSE published_image_name END
      `,
      [oldName, newName, oldName, newName]
    )
  }

  return updatedCount
}

function updateHomeConfigContent(raw, filenameMap) {
  if (!raw) return { changed: false, value: raw }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.images)) {
      return { changed: false, value: raw }
    }

    let changed = false
    parsed.images = parsed.images.map(item => {
      if (!item || typeof item !== 'object') return item
      const nextItem = { ...item }

      if (nextItem.filename && filenameMap.has(nextItem.filename)) {
        nextItem.filename = filenameMap.get(nextItem.filename)
        changed = true
      }

      if (nextItem.url) {
        for (const [oldName, newName] of filenameMap.entries()) {
          const nextUrl = replaceUrlFilename(nextItem.url, oldName, newName)
          if (nextUrl !== nextItem.url) {
            nextItem.url = nextUrl
            changed = true
          }
        }
      }

      return nextItem
    })

    return {
      changed,
      value: changed ? JSON.stringify(parsed) : raw
    }
  } catch {
    return { changed: false, value: raw }
  }
}

function updateHomeConfig(database, filenameMap) {
  const result = database.exec(`
    SELECT id, draft_data, published_data
    FROM contents
    WHERE content_type = 'home_config' AND content_key = 'main'
  `)

  if (!result.length || !result[0].values.length) {
    return false
  }

  const [id, draftData, publishedData] = result[0].values[0]
  const draftPatched = updateHomeConfigContent(draftData, filenameMap)
  const publishedPatched = updateHomeConfigContent(publishedData, filenameMap)

  if (!draftPatched.changed && !publishedPatched.changed) {
    return false
  }

  database.run(
    `UPDATE contents SET draft_data = ?, published_data = ? WHERE id = ?`,
    [draftPatched.value, publishedPatched.value, id]
  )

  return true
}

function updatePublicHomeConfigJson(filenameMap) {
  if (!fs.existsSync(publicDataHomeConfigPath)) return false

  const raw = fs.readFileSync(publicDataHomeConfigPath, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch {
    return false
  }

  if (!Array.isArray(data.images)) return false

  let changed = false
  data.images = data.images.map(item => {
    if (!item || typeof item !== 'object') return item
    const nextItem = { ...item }

    if (nextItem.filename && filenameMap.has(nextItem.filename)) {
      nextItem.filename = filenameMap.get(nextItem.filename)
      changed = true
    }

    if (nextItem.url) {
      for (const [oldName, newName] of filenameMap.entries()) {
        const nextUrl = replaceUrlFilename(nextItem.url, oldName, newName)
        if (nextUrl !== nextItem.url) {
          nextItem.url = nextUrl
          changed = true
        }
      }
    }

    return nextItem
  })

  if (changed) {
    fs.writeFileSync(publicDataHomeConfigPath, `${JSON.stringify(data, null, 2)}\n`)
  }

  return changed
}

async function processTarget(target) {
  const filenameMap = new Map()
  const changes = []
  const skips = []

  for (const dirPath of target.directories) {
    const files = listImageFiles(dirPath)

    for (const filePath of files) {
      const result = await optimizeToWebp(filePath, target)
      if (result.skipped) {
        skips.push({ filePath, reason: result.reason })
        continue
      }

      changes.push(result)
      if (result.oldName !== result.newName) {
        filenameMap.set(result.oldName, result.newName)
      }
    }
  }

  return { filenameMap, changes, skips }
}

async function loadDatabase() {
  const SQL = await initSqlJs()
  return new SQL.Database(fs.readFileSync(dbPath))
}

function saveDatabase(database) {
  fs.writeFileSync(dbPath, Buffer.from(database.export()))
}

async function main() {
  console.log('🚀 开始批量优化现有首页图和产品分类图...\n')

  const results = {}

  for (const target of TARGETS) {
    console.log(`🖼️  处理 ${target.label}...`)
    results[target.key] = await processTarget(target)
    console.log(`   - 实际优化: ${results[target.key].changes.length} 张`)
    console.log(`   - 跳过文件: ${results[target.key].skips.length} 张`)
  }

  const database = await loadDatabase()

  if (results.home.filenameMap.size > 0) {
    updateImageTable(database, 'home_images', 'home', results.home.filenameMap)
    updateHomeConfig(database, results.home.filenameMap)
    updatePublicHomeConfigJson(results.home.filenameMap)
  }

  if (results.products.filenameMap.size > 0) {
    updateImageTable(database, 'category_images', 'products', results.products.filenameMap)
    updateCategoryContents(database, results.products.filenameMap)
  }

  saveDatabase(database)
  database.close()

  const allChanges = [...results.home.changes, ...results.products.changes]
  const totalSavedBytes = allChanges.reduce((sum, item) => sum + item.savedBytes, 0)

  console.log('\n✅ 批量优化完成')
  console.log(`   - 共优化 ${allChanges.length} 张图片`)
  console.log(`   - 节省 ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`)

  allChanges
    .sort((a, b) => b.savedBytes - a.savedBytes)
    .slice(0, 10)
    .forEach(item => {
      console.log(
        `   - ${path.basename(item.oldPath)} -> ${item.newName} ` +
        `(${(item.originalBytes / 1024 / 1024).toFixed(2)} MB -> ${(item.optimizedBytes / 1024 / 1024).toFixed(2)} MB)`
      )
    })
}

main().catch(error => {
  console.error('\n❌ 批量优化失败:', error)
  process.exit(1)
})
