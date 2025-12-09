import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'cms.db')

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
  
  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_contents_sort ON contents(content_type, sort_order)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_versions_content ON content_versions(content_id)`)
  
  // 保存数据库
  saveDb()
  
  console.log('📦 Database initialized at:', dbPath)
  
  return db
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

// 执行更新/插入语句
function run(sql: string, params: any[] = []): void {
  const database = getDb()
  database.run(sql, params)
  saveDb()
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

export {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  run,
  lastInsertRowId,
  transaction
}

export default {
  initDb,
  getDb,
  saveDb,
  queryAll,
  queryOne,
  run,
  lastInsertRowId,
  transaction
}
