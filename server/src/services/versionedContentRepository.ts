import db from '../db'
import type {
  AdminContentItem,
  QueryOptions,
  RawContentRow,
  VersionSnapshot
} from './contentModels'

const { batchOperation, runNoSave } = db

function nowString(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function mapRow(row: any): RawContentRow {
  return row as RawContentRow
}

function toAdminItem<T = any>(row: RawContentRow): AdminContentItem<T> {
  return {
    id: row.id,
    contentType: row.content_type,
    contentKey: row.content_key,
    draftData: row.draft_data ? JSON.parse(row.draft_data) : null,
    publishedData: row.published_data ? JSON.parse(row.published_data) : null,
    status: row.status,
    version: row.version,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    hasUnpublishedChanges: row.draft_data !== row.published_data
  }
}

export const versionedContentRepository = {
  listPublishedRows(contentType: string): RawContentRow[] {
    return db.queryAll(
      `
      SELECT * FROM contents
      WHERE content_type = ? AND status = 'published' AND published_data IS NOT NULL
      ORDER BY sort_order ASC, id ASC
    `,
      [contentType]
    ).map(mapRow)
  },

  listActiveRows(contentType: string): RawContentRow[] {
    return db.queryAll(
      `
      SELECT * FROM contents
      WHERE content_type = ? AND status != 'deleted'
      ORDER BY sort_order ASC, id ASC
    `,
      [contentType]
    ).map(mapRow)
  },

  getRawContent(contentType: string, contentKey: string): RawContentRow | null {
    const row = db.queryOne(
      `
      SELECT * FROM contents
      WHERE content_type = ? AND content_key = ?
    `,
      [contentType, contentKey]
    )
    return row ? mapRow(row) : null
  },

  getRawContentsByKeys(contentType: string, contentKeys: string[]): RawContentRow[] {
    if (contentKeys.length === 0) return []

    return db.queryAll(
      `
      SELECT * FROM contents
      WHERE content_type = ? AND content_key IN (${contentKeys.map(() => '?').join(', ')})
      ORDER BY sort_order ASC, id ASC
    `,
      [contentType, ...contentKeys]
    ).map(mapRow)
  },

  getAdminList<T = any>(contentType: string, options: QueryOptions = {}) {
    const { page = 1, pageSize = 20 } = options
    const items = this.listActiveRows(contentType).map(row => toAdminItem<T>(row))
    const total = items.length
    const totalPages = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize

    return {
      data: items.slice(start, start + pageSize),
      pagination: { page, pageSize, total, totalPages }
    }
  },

  getAdminItem<T = any>(contentType: string, contentKey: string): AdminContentItem<T> | null {
    const row = this.getRawContent(contentType, contentKey)
    return row ? toAdminItem<T>(row) : null
  },

  getVersions<T = any>(contentType: string, contentKey: string): VersionSnapshot<T>[] {
    const content = db.queryOne(
      `
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `,
      [contentType, contentKey]
    )

    if (!content) return []

    return db.queryAll(
      `
      SELECT version, data, change_summary, created_at
      FROM content_versions
      WHERE content_id = ?
      ORDER BY version DESC
    `,
      [content.id]
    ).map(version => ({
      version: version.version,
      data: JSON.parse(version.data),
      changeSummary: version.change_summary,
      createdAt: version.created_at
    }))
  },

  saveDraft(contentType: string, contentKey: string, data: any): void {
    const draftData = JSON.stringify(data)
    const now = nowString()
    const existing = db.queryOne(
      `
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `,
      [contentType, contentKey]
    )

    if (existing) {
      db.run(
        `
        UPDATE contents SET draft_data = ?, updated_at = ?
        WHERE content_type = ? AND content_key = ?
      `,
        [draftData, now, contentType, contentKey]
      )
      return
    }

    const maxOrder = db.queryOne(
      `
      SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
    `,
      [contentType]
    )
    const sortOrder = Number(maxOrder?.max || 0) + 1

    db.run(
      `
      INSERT INTO contents (content_type, content_key, draft_data, status, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, 'draft', ?, ?, ?)
    `,
      [contentType, contentKey, draftData, sortOrder, now, now]
    )
  },

  batchSaveDraft(contentType: string, items: { key: string; data: any }[]): void {
    if (items.length === 0) return

    batchOperation(() => {
      const now = nowString()
      const existingRows = db.queryAll(
        `
        SELECT content_key, id, status FROM contents
        WHERE content_type = ? AND content_key IN (${items.map(() => '?').join(',')})
      `,
        [contentType, ...items.map(item => item.key)]
      )

      const activeKeys = new Set<string>()
      const deletedKeys = new Set<string>()

      existingRows.forEach(row => {
        if (row.status === 'deleted') {
          deletedKeys.add(row.content_key)
        } else {
          activeKeys.add(row.content_key)
        }
      })

      const maxOrderResult = db.queryOne(
        `
        SELECT MAX(sort_order) as max FROM contents WHERE content_type = ?
      `,
        [contentType]
      )
      let sortOrder = Number(maxOrderResult?.max || 0) + 1

      const toInsert: { key: string; data: string; sortOrder: number }[] = []
      const toUpdate: { key: string; data: string }[] = []
      const toRestore: { key: string; data: string }[] = []

      for (const item of items) {
        const draftData = JSON.stringify(item.data)
        if (activeKeys.has(item.key)) {
          toUpdate.push({ key: item.key, data: draftData })
        } else if (deletedKeys.has(item.key)) {
          toRestore.push({ key: item.key, data: draftData })
        } else {
          toInsert.push({ key: item.key, data: draftData, sortOrder: sortOrder++ })
        }
      }

      for (const item of toUpdate) {
        runNoSave(
          `
          UPDATE contents SET draft_data = ?, updated_at = ?
          WHERE content_type = ? AND content_key = ?
        `,
          [item.data, now, contentType, item.key]
        )
      }

      for (const item of toRestore) {
        runNoSave(
          `
          UPDATE contents SET draft_data = ?, status = 'draft', updated_at = ?
          WHERE content_type = ? AND content_key = ?
        `,
          [item.data, now, contentType, item.key]
        )
      }

      for (const item of toInsert) {
        runNoSave(
          `
          INSERT INTO contents (content_type, content_key, draft_data, status, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, 'draft', ?, ?, ?)
        `,
          [contentType, item.key, item.data, item.sortOrder, now, now]
        )
      }
    })
  },

  softDelete(contentType: string, contentKey: string): void {
    db.run(
      `
      UPDATE contents SET status = 'deleted', updated_at = ?
      WHERE content_type = ? AND content_key = ?
    `,
      [nowString(), contentType, contentKey]
    )
  },

  batchSoftDelete(contentType: string, contentKeys: string[]): number {
    if (contentKeys.length === 0) return 0

    return batchOperation(() => {
      runNoSave(
        `
        UPDATE contents SET status = 'deleted', updated_at = ?
        WHERE content_type = ? AND content_key IN (${contentKeys.map(() => '?').join(',')})
      `,
        [nowString(), contentType, ...contentKeys]
      )

      return contentKeys.length
    })
  },

  publish(contentType: string, contentKey: string, changeSummary?: string): number {
    const content = this.getRawContent(contentType, contentKey)

    if (!content) throw new Error('Content not found')
    if (!content.draft_data) throw new Error('No draft data to publish')

    const now = nowString()
    const newVersion = content.version + 1

    return db.transaction(() => {
      db.run(
        `
        INSERT INTO content_versions (content_id, version, data, change_summary, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
        [content.id, newVersion, content.draft_data, changeSummary || null, now]
      )

      db.run(
        `
        UPDATE contents SET
          published_data = ?,
          status = 'published',
          version = ?,
          published_at = ?,
          updated_at = ?
        WHERE id = ?
      `,
        [content.draft_data, newVersion, now, now, content.id]
      )

      return newVersion
    })
  },

  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string): number {
    if (contentKeys.length === 0) return 0

    const now = nowString()
    const summary = changeSummary || `批量发布 ${contentKeys.length} 条 ${contentType} 数据`
    let publishedCount = 0

    return batchOperation(() => {
      const contents = db.queryAll(
        `
        SELECT id, content_key, draft_data, version FROM contents
        WHERE content_type = ? AND content_key IN (${contentKeys.map(() => '?').join(',')})
          AND draft_data IS NOT NULL
      `,
        [contentType, ...contentKeys]
      )

      for (const content of contents) {
        const newVersion = content.version + 1

        runNoSave(
          `
          INSERT INTO content_versions (content_id, version, data, change_summary, created_at)
          VALUES (?, ?, ?, ?, ?)
        `,
          [content.id, newVersion, content.draft_data, summary, now]
        )

        runNoSave(
          `
          UPDATE contents SET
            published_data = ?,
            status = 'published',
            version = ?,
            published_at = ?,
            updated_at = ?
          WHERE id = ?
        `,
          [content.draft_data, newVersion, now, now, content.id]
        )

        publishedCount++
      }

      return publishedCount
    })
  },

  rollback(contentType: string, contentKey: string, version: number): void {
    const content = db.queryOne(
      `
      SELECT id FROM contents WHERE content_type = ? AND content_key = ?
    `,
      [contentType, contentKey]
    )

    if (!content) throw new Error('Content not found')

    const versionData = db.queryOne(
      `
      SELECT data FROM content_versions WHERE content_id = ? AND version = ?
    `,
      [content.id, version]
    )

    if (!versionData) throw new Error('Version not found')

    db.run(
      `
      UPDATE contents SET draft_data = ?, updated_at = ?
      WHERE id = ?
    `,
      [versionData.data, nowString(), content.id]
    )
  }
}
