#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const initSqlJsModule = require('sql.js')

const initSqlJs = initSqlJsModule.default || initSqlJsModule

const dbPath = process.env.CMS_DB_PATH
  ? path.resolve(process.env.CMS_DB_PATH)
  : path.resolve(__dirname, '../data/cms.db')

const uploadsBase = process.env.UPLOAD_PATH
  ? path.resolve(process.env.UPLOAD_PATH)
  : path.resolve(__dirname, '../uploads')

const publicBase = path.resolve(__dirname, '../../public')

const TABLES = [
  'site_images',
  'home_images',
  'category_images',
  'promotion_images',
  'brand_images',
  'avatar_images'
]

const SAFE_FILENAME_PATTERN = /^[A-Za-z0-9\u4e00-\u9fa5._-]+$/

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

function isSuspiciousFilename(filename) {
  return !SAFE_FILENAME_PATTERN.test(filename)
}

function getColumns(db, tableName) {
  const result = db.exec(`PRAGMA table_info(${tableName})`)
  if (!result.length) return []

  const [tableInfo] = result
  const nameIndex = tableInfo.columns.indexOf('name')
  if (nameIndex === -1) return []

  return tableInfo.values.map(row => row[nameIndex])
}

function queryRows(db, tableName, columns) {
  const selectColumns = ['id', 'filename', 'path']

  if (columns.includes('original_name')) {
    selectColumns.push('original_name')
  }

  if (columns.includes('image_type')) {
    selectColumns.push('image_type')
  }

  const result = db.exec(`SELECT ${selectColumns.join(', ')} FROM ${tableName} ORDER BY id ASC`)
  if (!result.length) return []

  const [query] = result
  return query.values.map(valueRow => {
    const row = {}
    query.columns.forEach((column, index) => {
      row[column] = valueRow[index]
    })
    return row
  })
}

function buildRowReport(tableName, row) {
  const relativePath = String(row.path || '')
  const uploadPath = path.join(uploadsBase, relativePath)
  const publicPath = path.join(publicBase, relativePath)
  const existsInUploads = fileExists(uploadPath)
  const existsInPublic = fileExists(publicPath)
  const filename = String(row.filename || '')

  return {
    table: tableName,
    id: row.id,
    filename,
    originalName: row.original_name || '',
    imageType: row.image_type || '',
    path: relativePath,
    existsInUploads,
    existsInPublic,
    status:
      existsInUploads || existsInPublic
        ? 'ok'
        : 'missing',
    suspiciousFilename: isSuspiciousFilename(filename)
  }
}

async function main() {
  if (!fileExists(dbPath)) {
    console.error(`数据库不存在: ${dbPath}`)
    process.exit(1)
  }

  const SQL = await initSqlJs()
  const buffer = fs.readFileSync(dbPath)
  const db = new SQL.Database(buffer)

  const reports = []

  for (const tableName of TABLES) {
    const columns = getColumns(db, tableName)
    if (!columns.length) {
      continue
    }

    const rows = queryRows(db, tableName, columns)
    rows.forEach(row => {
      reports.push(buildRowReport(tableName, row))
    })
  }

  const missingRows = reports.filter(row => row.status === 'missing')
  const suspiciousRows = reports.filter(row => row.suspiciousFilename)
  const suspiciousMissingRows = reports.filter(
    row => row.status === 'missing' && row.suspiciousFilename
  )

  console.log(`数据库: ${dbPath}`)
  console.log(`uploads: ${uploadsBase}`)
  console.log(`public: ${publicBase}`)
  console.log('')
  console.log(`总图片记录: ${reports.length}`)
  console.log(`缺文件记录: ${missingRows.length}`)
  console.log(`可疑文件名记录: ${suspiciousRows.length}`)
  console.log(`缺文件且文件名可疑: ${suspiciousMissingRows.length}`)
  console.log('')

  if (missingRows.length) {
    console.log('=== 缺文件记录 ===')
    missingRows.forEach(row => {
      console.log(`[${row.table}] #${row.id} ${row.filename} -> ${row.path}`)
    })
    console.log('')
  }

  if (suspiciousRows.length) {
    console.log('=== 可疑文件名记录 ===')
    suspiciousRows.forEach(row => {
      console.log(
        `[${row.table}] #${row.id} ${row.filename} -> ${row.path} (${row.status})`
      )
    })
    console.log('')
  }

  if (suspiciousMissingRows.length) {
    const grouped = suspiciousMissingRows.reduce((acc, row) => {
      if (!acc[row.table]) {
        acc[row.table] = []
      }
      acc[row.table].push(row.id)
      return acc
    }, {})

    console.log('=== 可参考的删除 SQL（先备份，再人工确认）===')
    Object.entries(grouped).forEach(([tableName, ids]) => {
      console.log(`DELETE FROM ${tableName} WHERE id IN (${ids.join(', ')});`)
    })
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
