import db from '../db'
import type { RawContentRow } from './contentModels'

export type CatalogStructuredContentType = 'product' | 'brand' | 'promotion' | 'category'

type CatalogPayload = Record<string, any>

interface CatalogTableConfig {
  tableName: string
  buildStateColumns: (payload: CatalogPayload | null, contentKey: string) => Record<string, any>
}

const CATALOG_TABLE_CONFIG: Record<CatalogStructuredContentType, CatalogTableConfig> = {
  product: {
    tableName: 'catalog_products',
    buildStateColumns(payload, contentKey) {
      const normalized = normalizePayload(payload, contentKey)
      return {
        payload_json: toPayloadJson(normalized),
        name: toNullableText(normalized?.name),
        category_id: toNullableText(normalized?.categoryId),
        brand: toNullableText(normalized?.brand),
        sku: toNullableText(normalized?.sku),
        price: toNullableText(normalized?.price),
        specs: toNullableText(normalized?.specs),
        unit: toNullableText(normalized?.unit),
        desc: toNullableText(normalized?.desc)
      }
    }
  },
  brand: {
    tableName: 'catalog_brands',
    buildStateColumns(payload, contentKey) {
      const normalized = normalizePayload(payload, contentKey)
      return {
        payload_json: toPayloadJson(normalized),
        name: toNullableText(normalized?.name),
        logo_url: toNullableText(normalized?.logo_url),
        certificate_url: toNullableText(normalized?.certificate_url),
        brand_type: toNullableText(normalized?.brand_type),
        country: toNullableText(normalized?.country),
        description: toNullableText(normalized?.description),
        website: toNullableText(normalized?.website),
        sort_order_value: toNullableNumber(normalized?.sort_order),
        is_own_brand: toNullableBooleanFlag(normalized?.is_own_brand),
        brand_id: toNullableText(normalized?.brand_id),
        show_name: toNullableText(normalized?.show_name),
        is_own: toNullableBooleanFlag(normalized?.is_own),
        website_url: toNullableText(normalized?.website_url)
      }
    }
  },
  promotion: {
    tableName: 'catalog_promotions',
    buildStateColumns(payload, contentKey) {
      const normalized = normalizePayload(payload, contentKey)
      return {
        payload_json: toPayloadJson(normalized),
        title: toNullableText(normalized?.title),
        summary: toNullableText(normalized?.summary),
        description: toNullableText(normalized?.description),
        cover_id: toNullableNumber(normalized?.coverId),
        poster_id: toNullableNumber(normalized?.posterId),
        cover_url: toNullableText(normalized?.cover_url),
        poster_url: toNullableText(normalized?.poster_url),
        icon_class: toNullableText(normalized?.icon_class),
        publish_date: toNullableText(normalized?.publish_date),
        start_date: toNullableText(normalized?.start_date),
        end_date: toNullableText(normalized?.end_date),
        original_price: toNullableNumber(normalized?.original_price),
        current_price: toNullableNumber(normalized?.current_price),
        discount_badge: toNullableText(normalized?.discount_badge),
        tags_json: toJsonText(normalized?.tags),
        applicable_products: toNullableText(normalized?.applicable_products)
      }
    }
  },
  category: {
    tableName: 'catalog_categories',
    buildStateColumns(payload, contentKey) {
      const normalized = normalizePayload(payload, contentKey)
      return {
        payload_json: toPayloadJson(normalized),
        name: toNullableText(normalized?.name),
        image_id: toNullableNumber(normalized?.imageId),
        image_name: toNullableText(normalized?.imageName),
        description: toNullableText(normalized?.description)
      }
    }
  }
}

const sourceSignatureCache = new Map<CatalogStructuredContentType, string>()

function isCatalogPayload(value: unknown): value is CatalogPayload {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStructuredContentType(contentType: string): contentType is CatalogStructuredContentType {
  return contentType in CATALOG_TABLE_CONFIG
}

function normalizePayload(payload: CatalogPayload | null, contentKey: string): CatalogPayload | null {
  if (!isCatalogPayload(payload)) {
    return null
  }

  const normalized = { ...payload }
  if (normalized.id === undefined || normalized.id === null || normalized.id === '') {
    normalized.id = contentKey
  }

  return normalized
}

function parsePayload(raw: string | null): CatalogPayload | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    return isCatalogPayload(parsed) ? parsed : null
  } catch {
    return null
  }
}

function toPayloadJson(payload: CatalogPayload | null): string | null {
  return payload ? JSON.stringify(payload) : null
}

function toNullableText(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null
  }
  return String(value)
}

function toNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toNullableBooleanFlag(value: unknown): number | null {
  if (value === undefined || value === null) {
    return null
  }
  return value ? 1 : 0
}

function toJsonText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }
  return JSON.stringify(value)
}

function prefixColumns(prefix: 'draft' | 'published', columns: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(columns).map(([key, value]) => [`${prefix}_${key}`, value])
  )
}

function buildStructuredRecord(contentType: CatalogStructuredContentType, row: any): Record<string, any> {
  const config = CATALOG_TABLE_CONFIG[contentType]
  const draftPayload = parsePayload(row.draft_data)
  const publishedPayload = parsePayload(row.published_data)

  return {
    content_id: row.id,
    content_key: row.content_key,
    status: row.status,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
    ...prefixColumns('draft', config.buildStateColumns(draftPayload, row.content_key)),
    ...prefixColumns('published', config.buildStateColumns(publishedPayload, row.content_key))
  }
}

function insertStructuredRecord(tableName: string, record: Record<string, any>) {
  const fields = Object.keys(record)
  const values = fields.map(field => record[field])

  db.runNoSave(
    `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
    values
  )
}

function upsertStructuredRecord(tableName: string, record: Record<string, any>) {
  const fields = Object.keys(record)
  const values = fields.map(field => record[field])
  const updateFields = fields.filter(field => field !== 'content_id')

  db.runNoSave(
    `
    INSERT INTO ${tableName} (${fields.join(', ')})
    VALUES (${fields.map(() => '?').join(', ')})
    ON CONFLICT(content_id) DO UPDATE SET
      ${updateFields.map(field => `${field} = excluded.${field}`).join(', ')}
    `,
    values
  )
}

function getContentSourceSignature(contentType: CatalogStructuredContentType): string {
  const source = db.queryOne(
    `
    SELECT
      COUNT(*) AS count,
      COALESCE(MAX(id), 0) AS max_id,
      COALESCE(SUM(id), 0) AS sum_id,
      MAX(updated_at) AS max_updated_at
    FROM contents
    WHERE content_type = ? AND status != 'deleted'
  `,
    [contentType]
  )

  return `${source?.count || 0}:${source?.max_id || 0}:${source?.sum_id || 0}:${source?.max_updated_at || ''}`
}

function getPublishedTableRows(contentType: CatalogStructuredContentType) {
  const { tableName } = CATALOG_TABLE_CONFIG[contentType]
  return db.queryAll(
    `
    SELECT * FROM ${tableName}
    WHERE status = 'published' AND published_payload_json IS NOT NULL
    ORDER BY sort_order ASC, content_id ASC
  `
  )
}

function getActiveTableRows(contentType: CatalogStructuredContentType) {
  const { tableName } = CATALOG_TABLE_CONFIG[contentType]
  return db.queryAll(
    `
    SELECT * FROM ${tableName}
    ORDER BY sort_order ASC, content_id ASC
  `
  )
}

function parsePublishedItem(row: any): CatalogPayload | null {
  return parsePayload(row.published_payload_json)
}

function parseActiveItem(row: any): CatalogPayload | null {
  return parsePayload(row.draft_payload_json) || parsePayload(row.published_payload_json)
}

export const catalogStructuredStorageService = {
  supports(contentType: string): contentType is CatalogStructuredContentType {
    return isStructuredContentType(contentType)
  },

  syncAll() {
    ;(Object.keys(CATALOG_TABLE_CONFIG) as CatalogStructuredContentType[]).forEach(contentType => {
      this.syncContentType(contentType)
    })
  },

  syncContentType(contentType: string) {
    if (!isStructuredContentType(contentType)) {
      return
    }

    const { tableName } = CATALOG_TABLE_CONFIG[contentType]
    const rows = db.queryAll(
      `
      SELECT *
      FROM contents
      WHERE content_type = ? AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `,
      [contentType]
    )

    db.batchOperation(() => {
      db.runNoSave(`DELETE FROM ${tableName}`)
      rows.forEach(row => insertStructuredRecord(tableName, buildStructuredRecord(contentType, row)))
    })

    sourceSignatureCache.set(contentType, getContentSourceSignature(contentType))
  },

  ensureContentTypeSynced(contentType: string) {
    if (!isStructuredContentType(contentType)) {
      return
    }

    const currentSignature = getContentSourceSignature(contentType)
    if (sourceSignatureCache.get(contentType) !== currentSignature) {
      this.syncContentType(contentType)
    }
  },

  upsertFromContentRow(contentType: string, row: RawContentRow | null) {
    if (!row || !isStructuredContentType(contentType) || row.status === 'deleted') {
      return
    }

    const { tableName } = CATALOG_TABLE_CONFIG[contentType]
    db.batchOperation(() => {
      upsertStructuredRecord(tableName, buildStructuredRecord(contentType, row))
    })
    sourceSignatureCache.set(contentType, getContentSourceSignature(contentType))
  },

  upsertManyFromContentRows(contentType: string, rows: RawContentRow[]) {
    if (!isStructuredContentType(contentType) || rows.length === 0) {
      return
    }

    const { tableName } = CATALOG_TABLE_CONFIG[contentType]
    db.batchOperation(() => {
      rows
        .filter(row => row.status !== 'deleted')
        .forEach(row => upsertStructuredRecord(tableName, buildStructuredRecord(contentType, row)))
    })
    sourceSignatureCache.set(contentType, getContentSourceSignature(contentType))
  },

  deleteByContentKeys(contentType: string, contentKeys: string[]) {
    if (!isStructuredContentType(contentType) || contentKeys.length === 0) {
      return
    }

    const { tableName } = CATALOG_TABLE_CONFIG[contentType]
    db.batchOperation(() => {
      db.runNoSave(
        `
        DELETE FROM ${tableName}
        WHERE content_key IN (${contentKeys.map(() => '?').join(', ')})
      `,
        contentKeys
      )
    })
    sourceSignatureCache.set(contentType, getContentSourceSignature(contentType))
  },

  listPublishedData(contentType: string): CatalogPayload[] {
    if (!isStructuredContentType(contentType)) {
      return []
    }

    return getPublishedTableRows(contentType)
      .map(parsePublishedItem)
      .filter(Boolean) as CatalogPayload[]
  },

  listActiveData(contentType: string): CatalogPayload[] {
    if (!isStructuredContentType(contentType)) {
      return []
    }

    return getActiveTableRows(contentType)
      .map(parseActiveItem)
      .filter(Boolean) as CatalogPayload[]
  },

  getPublishedOne(contentType: string, contentKey: string): CatalogPayload | null {
    if (!isStructuredContentType(contentType)) {
      return null
    }

    const { tableName } = CATALOG_TABLE_CONFIG[contentType]
    const row = db.queryOne(
      `
      SELECT *
      FROM ${tableName}
      WHERE content_key = ? AND status = 'published' AND published_payload_json IS NOT NULL
    `,
      [contentKey]
    )

    return row ? parsePublishedItem(row) : null
  },

  getProductCountMap(): Map<string, number> {
    const rows = db.queryAll(
      `
      SELECT COALESCE(NULLIF(draft_category_id, ''), published_category_id) AS category_id
      FROM catalog_products
    `
    )

    const countMap = new Map<string, number>()

    rows.forEach(row => {
      if (!row.category_id) return
      countMap.set(row.category_id, (countMap.get(row.category_id) || 0) + 1)
    })

    return countMap
  }
}
