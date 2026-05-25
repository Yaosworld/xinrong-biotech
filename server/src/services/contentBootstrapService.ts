import fs from 'fs'
import path from 'path'
import { queryOne, run, transaction } from '../db'

type JsonObject = Record<string, any>

interface SeedListOptions {
  contentType: string
  items: any[]
  idField?: string
  sortOrderField?: string
}

const nowString = () => new Date().toISOString().replace('T', ' ').slice(0, 19)

const publicDataDir = path.join(__dirname, '../../../public/data')

function readJsonFile<T>(filename: string): T {
  const fullPath = path.join(publicDataDir, filename)
  const raw = fs.readFileSync(fullPath, 'utf-8')
  return JSON.parse(raw) as T
}

function isPlainObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function mergeMissingFields<T>(current: T, defaults: T): { value: T; changed: boolean } {
  if (current === undefined || current === null) {
    return { value: deepClone(defaults), changed: true }
  }

  if (Array.isArray(defaults)) {
    return { value: current, changed: false }
  }

  if (!isPlainObject(defaults)) {
    return { value: current, changed: false }
  }

  const base: JsonObject = isPlainObject(current) ? deepClone(current) : {}
  let changed = !isPlainObject(current)

  Object.entries(defaults).forEach(([key, defaultValue]) => {
    const existingValue = base[key]

    if (existingValue === undefined || existingValue === null) {
      base[key] = deepClone(defaultValue)
      changed = true
      return
    }

    if (isPlainObject(defaultValue) && isPlainObject(existingValue)) {
      const merged = mergeMissingFields(existingValue, defaultValue)
      if (merged.changed) {
        base[key] = merged.value
        changed = true
      }
    }
  })

  return { value: base as T, changed }
}

function upsertPublishedContent(
  contentType: string,
  contentKey: string,
  data: JsonObject | any[],
  sortOrder: number
): boolean {
  const now = nowString()
  const jsonData = JSON.stringify(data)
  const existing = queryOne(
    `SELECT id, status FROM contents WHERE content_type = ? AND content_key = ?`,
    [contentType, contentKey]
  )

  if (existing && existing.status !== 'deleted') {
    return false
  }

  if (existing) {
    run(
      `UPDATE contents
       SET draft_data = ?, published_data = ?, status = 'published', version = 1,
           sort_order = ?, updated_at = ?, published_at = ?
       WHERE id = ?`,
      [jsonData, jsonData, sortOrder, now, now, existing.id]
    )
    return true
  }

  run(
    `INSERT INTO contents (
      content_type, content_key, draft_data, published_data, status,
      version, sort_order, created_at, updated_at, published_at
    ) VALUES (?, ?, ?, ?, 'published', 1, ?, ?, ?, ?)`,
    [contentType, contentKey, jsonData, jsonData, sortOrder, now, now, now]
  )
  return true
}

function ensureSingletonPublished(contentType: string, contentKey: string, data: JsonObject): boolean {
  const existing = queryOne(
    `SELECT id, status, draft_data, published_data, sort_order FROM contents WHERE content_type = ? AND content_key = ?`,
    [contentType, contentKey]
  )

  if (!existing || existing.status === 'deleted') {
    return upsertPublishedContent(contentType, contentKey, data, 1)
  }

  const currentDraft = existing.draft_data ? JSON.parse(existing.draft_data) : null
  const currentPublished = existing.published_data ? JSON.parse(existing.published_data) : null
  const mergedDraft = mergeMissingFields(currentDraft, data)
  const mergedPublished = mergeMissingFields(currentPublished, data)

  if (!mergedDraft.changed && !mergedPublished.changed) {
    return false
  }

  const now = nowString()
  run(
    `UPDATE contents
     SET draft_data = ?, published_data = ?, updated_at = ?
     WHERE id = ?`,
    [
      JSON.stringify(mergedDraft.value),
      JSON.stringify(mergedPublished.value),
      now,
      existing.id
    ]
  )

  return true
}

function ensureListPublished(options: SeedListOptions): number {
  const {
    contentType,
    items,
    idField = 'id',
    sortOrderField = 'sort_order'
  } = options

  const activeCount = queryOne(
    `SELECT COUNT(*) as count FROM contents WHERE content_type = ? AND status != 'deleted'`,
    [contentType]
  )?.count || 0

  if (activeCount > 0) {
    return 0
  }

  let seededCount = 0
  items.forEach((item, index) => {
    const contentKey = String(item[idField])
    const sortOrder = typeof item[sortOrderField] === 'number' ? item[sortOrderField] : index + 1
    if (upsertPublishedContent(contentType, contentKey, item, sortOrder)) {
      seededCount++
    }
  })

  return seededCount
}

export const contentBootstrapService = {
  initializePublishedContent(): void {
    const siteConfig = readJsonFile<JsonObject>('site-config.json')
    const about = readJsonFile<JsonObject>('about.json')
    const homeConfig = readJsonFile<JsonObject>('home-config.json')
    const banners = readJsonFile<Record<string, JsonObject>>('banners.json')
    const brands = readJsonFile<any[]>('brands.json')
    const products = readJsonFile<any[]>('products.json')
    const promotions = readJsonFile<any[]>('promotions.json')

    const seededSummary = {
      siteConfig: 0,
      about: 0,
      homeConfig: 0,
      banners: 0,
      brands: 0,
      products: 0,
      promotions: 0
    }

    transaction(() => {
      if (ensureSingletonPublished('site_config', 'main', siteConfig)) {
        seededSummary.siteConfig++
      }

      if (ensureSingletonPublished('about', 'main', about)) {
        seededSummary.about++
      }

      if (ensureSingletonPublished('home_config', 'main', homeConfig)) {
        seededSummary.homeConfig++
      }

      Object.entries(banners).forEach(([key, value], index) => {
        if (upsertPublishedContent('banner', key, value, index + 1)) {
          seededSummary.banners++
        }
      })

      seededSummary.brands = ensureListPublished({
        contentType: 'brand',
        items: brands
      })

      seededSummary.products = ensureListPublished({
        contentType: 'product',
        items: products
      })

      seededSummary.promotions = ensureListPublished({
        contentType: 'promotion',
        items: promotions
      })
    })

    const totalSeeded = Object.values(seededSummary).reduce((sum, count) => sum + count, 0)
    if (totalSeeded > 0) {
      console.log('🧩 已初始化 CMS 发布内容:', seededSummary)
    } else {
      console.log('🧩 CMS 发布内容已存在，跳过初始化')
    }
  }
}
