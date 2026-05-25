// @ts-ignore
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'

const isTestEnv =
  Boolean(process.env.VITEST) ||
  process.env.NODE_ENV === 'test' ||
  process.argv.some(arg => arg.toLowerCase().includes('vitest'))

const defaultDbFilename = isTestEnv ? 'test-cms.db' : 'cms.db'
const configuredDbPath = process.env.CMS_DB_PATH
const dbPath = configuredDbPath
  ? path.resolve(configuredDbPath)
  : path.join(__dirname, '../data', defaultDbFilename)

// 确保 data 目录存在
const dataDir = path.dirname(dbPath)
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db: SqlJsDatabase | null = null

// 初始化数据库
async function initDb(): Promise<SqlJsDatabase> {
  if (db) return db
  
  const SQL = await initSqlJs()
  
  // 如果数据库文件存在，加载它
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
  // 初始化表结构
  db.run(`
    CREATE TABLE IF NOT EXISTS contents (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type    TEXT NOT NULL,
      content_key     TEXT NOT NULL,
      draft_data      TEXT,
      published_data  TEXT,
      status          TEXT DEFAULT 'draft',
      version         INTEGER DEFAULT 1,
      sort_order      INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
      published_at    TEXT,
      UNIQUE(content_type, content_key)
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS content_versions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id      INTEGER NOT NULL,
      version         INTEGER NOT NULL,
      data            TEXT NOT NULL,
      change_summary  TEXT,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(content_id, version),
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS import_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type    TEXT NOT NULL,
      import_mode     TEXT NOT NULL,
      file_name       TEXT,
      total_count     INTEGER,
      added_count     INTEGER,
      updated_count   INTEGER,
      deleted_count   INTEGER,
      error_count     INTEGER,
      created_at      TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS catalog_products (
      content_id              INTEGER PRIMARY KEY,
      content_key             TEXT NOT NULL UNIQUE,
      status                  TEXT NOT NULL,
      sort_order              INTEGER DEFAULT 0,
      created_at              TEXT,
      updated_at              TEXT,
      published_at            TEXT,
      draft_payload_json      TEXT,
      draft_name              TEXT,
      draft_category_id       TEXT,
      draft_brand             TEXT,
      draft_sku               TEXT,
      draft_price             TEXT,
      draft_specs             TEXT,
      draft_unit              TEXT,
      draft_desc              TEXT,
      published_payload_json  TEXT,
      published_name          TEXT,
      published_category_id   TEXT,
      published_brand         TEXT,
      published_sku           TEXT,
      published_price         TEXT,
      published_specs         TEXT,
      published_unit          TEXT,
      published_desc          TEXT,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS catalog_brands (
      content_id                      INTEGER PRIMARY KEY,
      content_key                     TEXT NOT NULL UNIQUE,
      status                          TEXT NOT NULL,
      sort_order                      INTEGER DEFAULT 0,
      created_at                      TEXT,
      updated_at                      TEXT,
      published_at                    TEXT,
      draft_payload_json              TEXT,
      draft_name                      TEXT,
      draft_logo_url                  TEXT,
      draft_certificate_url           TEXT,
      draft_brand_type                TEXT,
      draft_country                   TEXT,
      draft_description               TEXT,
      draft_website                   TEXT,
      draft_sort_order_value          INTEGER,
      draft_is_own_brand              INTEGER,
      draft_brand_id                  TEXT,
      draft_show_name                 TEXT,
      draft_is_own                    INTEGER,
      draft_website_url               TEXT,
      published_payload_json          TEXT,
      published_name                  TEXT,
      published_logo_url              TEXT,
      published_certificate_url       TEXT,
      published_brand_type            TEXT,
      published_country               TEXT,
      published_description           TEXT,
      published_website               TEXT,
      published_sort_order_value      INTEGER,
      published_is_own_brand          INTEGER,
      published_brand_id              TEXT,
      published_show_name             TEXT,
      published_is_own                INTEGER,
      published_website_url           TEXT,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS catalog_promotions (
      content_id                        INTEGER PRIMARY KEY,
      content_key                       TEXT NOT NULL UNIQUE,
      status                            TEXT NOT NULL,
      sort_order                        INTEGER DEFAULT 0,
      created_at                        TEXT,
      updated_at                        TEXT,
      published_at                      TEXT,
      draft_payload_json                TEXT,
      draft_title                       TEXT,
      draft_summary                     TEXT,
      draft_description                 TEXT,
      draft_cover_id                    INTEGER,
      draft_poster_id                   INTEGER,
      draft_cover_url                   TEXT,
      draft_poster_url                  TEXT,
      draft_icon_class                  TEXT,
      draft_publish_date                TEXT,
      draft_start_date                  TEXT,
      draft_end_date                    TEXT,
      draft_original_price              REAL,
      draft_current_price               REAL,
      draft_discount_badge              TEXT,
      draft_tags_json                   TEXT,
      draft_applicable_products         TEXT,
      published_payload_json            TEXT,
      published_title                   TEXT,
      published_summary                 TEXT,
      published_description             TEXT,
      published_cover_id                INTEGER,
      published_poster_id               INTEGER,
      published_cover_url               TEXT,
      published_poster_url              TEXT,
      published_icon_class              TEXT,
      published_publish_date            TEXT,
      published_start_date              TEXT,
      published_end_date                TEXT,
      published_original_price          REAL,
      published_current_price           REAL,
      published_discount_badge          TEXT,
      published_tags_json               TEXT,
      published_applicable_products     TEXT,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS catalog_categories (
      content_id                INTEGER PRIMARY KEY,
      content_key               TEXT NOT NULL UNIQUE,
      status                    TEXT NOT NULL,
      sort_order                INTEGER DEFAULT 0,
      created_at                TEXT,
      updated_at                TEXT,
      published_at              TEXT,
      draft_payload_json        TEXT,
      draft_name                TEXT,
      draft_image_id            INTEGER,
      draft_image_name          TEXT,
      draft_description         TEXT,
      published_payload_json    TEXT,
      published_name            TEXT,
      published_image_id        INTEGER,
      published_image_name      TEXT,
      published_description     TEXT,
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    )
  `)
  
  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_sort ON contents(content_type, sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_content ON content_versions(content_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_products_status_sort ON catalog_products(status, sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_products_category ON catalog_products(published_category_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_products_brand ON catalog_products(published_brand)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_brands_status_sort ON catalog_brands(status, sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_brands_brand_type ON catalog_brands(published_brand_type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_promotions_status_sort ON catalog_promotions(status, sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_promotions_dates ON catalog_promotions(published_publish_date, published_start_date, published_end_date)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_catalog_categories_status_sort ON catalog_categories(status, sort_order)`)
  
  // 创建管理员表
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT NOT NULL UNIQUE,
      password_hash   TEXT NOT NULL,
      role            TEXT NOT NULL DEFAULT 'admin',
      display_name    TEXT,
      email           TEXT,
      phone           TEXT,
      avatar_id       INTEGER,
      status          TEXT DEFAULT 'active',
      login_attempts  INTEGER DEFAULT 0,
      locked_until    TEXT,
      last_login_at   TEXT,
      last_login_ip   TEXT,
      created_by      INTEGER,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  
  // 创建操作日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id        INTEGER NOT NULL,
      action          TEXT NOT NULL,
      target_type     TEXT,
      target_id       TEXT,
      detail          TEXT,
      ip_address      TEXT,
      user_agent      TEXT,
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    )
  `)
  
  // 管理员表索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON admin_logs(created_at)`)
  
  // 数据库迁移：为旧表添加缺失的列
  migrateAdminsTable(db)
  
  // 保存数据库
  saveDb()
  
  // 初始化默认超级管理员
  await initDefaultAdmin()
  
  console.log('📦 Database initialized at:', dbPath)
  
  return db
}

// 数据库迁移：为 admins 表添加缺失的列
function migrateAdminsTable(database: SqlJsDatabase) {
  // 检查 avatar_id 列是否存在
  const tableInfo = database.exec("PRAGMA table_info(admins)")
  if (tableInfo.length > 0) {
    const columns = tableInfo[0].values.map((row: any) => row[1])
    
    if (!columns.includes('avatar_id')) {
      console.log('🔄 迁移: 为 admins 表添加 avatar_id 列')
      database.run('ALTER TABLE admins ADD COLUMN avatar_id INTEGER')
    }
  }
}

// 初始化默认超级管理员
async function initDefaultAdmin() {
  if (!db) return
  
  const stmt = db.prepare('SELECT id FROM admins WHERE username = ?')
  stmt.bind(['admin'])
  const exists = stmt.step()
  stmt.free()
  
  if (!exists) {
    const defaultPassword = 'Admin@123'
    const passwordHash = await bcrypt.hash(defaultPassword, 10)
    
    db.run(
      `INSERT INTO admins (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)`,
      ['admin', passwordHash, 'super_admin', '超级管理员']
    )
    saveDb()
    
    console.log('✅ 默认超级管理员已创建')
    console.log('   用户名: admin')
    console.log('   密码: Admin@123')
    console.log('   ⚠️  请首次登录后立即修改密码！')
  }
}

// 保存数据库到文件
function saveDb() {
  if (db) {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(dbPath, buffer)
  }
}

// 获取数据库实例
function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

// 执行查询并返回所有结果
function queryAll(sql: string, params: any[] = []): any[] {
  const database = getDb()
  const stmt = database.prepare(sql)
  stmt.bind(params)
  
  const results: any[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject()
    results.push(row)
  }
  stmt.free()
  return results
}

// 执行查询并返回第一条结果
function queryOne(sql: string, params: any[] = []): any | null {
  const results = queryAll(sql, params)
  return results.length > 0 ? results[0] : null
}

// 批量操作标志 - 在批量操作期间不自动保存
let inBatchOperation = false

// 执行更新/插入语句
function run(sql: string, params: any[] = []): void {
  const database = getDb()
  database.run(sql, params)
  // 只有在非批量操作时才自动保存
  if (!inBatchOperation) {
    saveDb()
  }
}

// 执行更新/插入语句（不自动保存，用于批量操作内部）
function runNoSave(sql: string, params: any[] = []): void {
  const database = getDb()
  database.run(sql, params)
}

// 获取最后插入的 ID
function lastInsertRowId(): number {
  const result = queryOne('SELECT last_insert_rowid() as id')
  return result?.id || 0
}

// 事务执行 (sql.js 是同步的，简化处理)
function transaction<T>(fn: () => T): T {
  try {
    const result = fn()
    saveDb()
    return result
  } catch (e) {
    throw e
  }
}

/**
 * 批量操作执行器
 * 在批量操作期间禁用自动保存，操作完成后统一保存一次
 * 这可以将 N 次磁盘写入减少为 1 次，大幅提升性能
 */
function batchOperation<T>(fn: () => T): T {
  const wasInBatch = inBatchOperation
  inBatchOperation = true
  try {
    const result = fn()
    return result
  } finally {
    inBatchOperation = wasInBatch
    // 只有最外层批量操作结束时才保存
    if (!wasInBatch) {
      saveDb()
    }
  }
}

export {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  run,
  runNoSave,
  lastInsertRowId,
  transaction,
  batchOperation
}

export default {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  run,
  runNoSave,
  lastInsertRowId,
  transaction,
  batchOperation
}
