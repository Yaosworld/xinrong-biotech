/**
 * 数据迁移脚本
 * 将 public/data/*.json 中的数据迁移到 SQLite 数据库
 * 
 * 使用方法: node scripts/migrate.js
 */

const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

// 确保 data 目录存在
const dataDir = path.join(__dirname, '../data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'cms.db')

// 读取 JSON 文件
const readJson = (filename) => {
  const filepath = path.join(__dirname, '../../public/data', filename)
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  文件不存在: ${filename}`)
    return null
  }
  try {
    const content = fs.readFileSync(filepath, 'utf-8')
    return JSON.parse(content)
  } catch (e) {
    console.log(`❌ 解析失败: ${filename} - ${e.message}`)
    return null
  }
}

async function migrate() {
  console.log('🚀 开始迁移数据...\n')
  
  const SQL = await initSqlJs()
  
  // 如果数据库文件存在，加载它；否则创建新的
  let db
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath)
    db = new SQL.Database(buffer)
    console.log('📂 加载现有数据库')
  } else {
    db = new SQL.Database()
    console.log('📂 创建新数据库')
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
  
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  
  // 通用迁移函数
  const migrateContent = (contentType, data, idField = 'id') => {
    let count = 0
    for (let i = 0; i < data.length; i++) {
      const item = data[i]
      const key = String(item[idField])
      const json = JSON.stringify(item)
      
      // 检查是否已存在
      const existing = db.exec(`SELECT id FROM contents WHERE content_type = '${contentType}' AND content_key = '${key}'`)
      
      if (existing.length > 0 && existing[0].values.length > 0) {
        // 更新
        db.run(`UPDATE contents SET draft_data = ?, published_data = ?, updated_at = ? WHERE content_type = ? AND content_key = ?`,
          [json, json, now, contentType, key])
      } else {
        // 插入
        db.run(`INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, sort_order, created_at, updated_at, published_at)
          VALUES (?, ?, ?, ?, 'published', 1, ?, ?, ?, ?)`,
          [contentType, key, json, json, i + 1, now, now, now])
      }
      count++
    }
    return count
  }
  
  // 迁移产品
  const products = readJson('products.json')
  if (products && Array.isArray(products) && products.length > 0) {
    const count = migrateContent('product', products)
    console.log(`✅ 迁移了 ${count} 个产品`)
  } else {
    console.log(`⏭️  跳过产品迁移 (无数据)`)
  }
  
  // 迁移品牌
  const brands = readJson('brands.json')
  if (brands && Array.isArray(brands) && brands.length > 0) {
    const count = migrateContent('brand', brands)
    console.log(`✅ 迁移了 ${count} 个品牌`)
  } else {
    console.log(`⏭️  跳过品牌迁移 (无数据)`)
  }
  
  // 迁移促销活动
  const promotions = readJson('promotions.json')
  if (promotions && Array.isArray(promotions) && promotions.length > 0) {
    const count = migrateContent('promotion', promotions)
    console.log(`✅ 迁移了 ${count} 个促销活动`)
  } else {
    console.log(`⏭️  跳过促销活动迁移 (无数据)`)
  }
  
  // 迁移 Banner（按页面分组）
  const banners = readJson('banners.json')
  if (banners && typeof banners === 'object' && !Array.isArray(banners)) {
    let count = 0
    for (const [key, banner] of Object.entries(banners)) {
      const json = JSON.stringify(banner)
      
      const existing = db.exec(`SELECT id FROM contents WHERE content_type = 'banner' AND content_key = '${key}'`)
      
      if (existing.length > 0 && existing[0].values.length > 0) {
        db.run(`UPDATE contents SET draft_data = ?, published_data = ?, updated_at = ? WHERE content_type = 'banner' AND content_key = ?`,
          [json, json, now, key])
      } else {
        db.run(`INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, created_at, updated_at, published_at)
          VALUES ('banner', ?, ?, ?, 'published', 1, ?, ?, ?)`,
          [key, json, json, now, now, now])
      }
      count++
    }
    console.log(`✅ 迁移了 ${count} 个 Banner 配置`)
  } else {
    console.log(`⏭️  跳过 Banner 迁移 (无数据或格式不正确)`)
  }
  
  // 迁移关于我们
  const about = readJson('about.json')
  if (about && Object.keys(about).length > 0) {
    const json = JSON.stringify(about)
    
    const existing = db.exec(`SELECT id FROM contents WHERE content_type = 'about' AND content_key = 'main'`)
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`UPDATE contents SET draft_data = ?, published_data = ?, updated_at = ? WHERE content_type = 'about' AND content_key = 'main'`,
        [json, json, now])
    } else {
      db.run(`INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, created_at, updated_at, published_at)
        VALUES ('about', 'main', ?, ?, 'published', 1, ?, ?, ?)`,
        [json, json, now, now, now])
    }
    console.log(`✅ 迁移了关于我们页面配置`)
  } else {
    console.log(`⏭️  跳过关于我们迁移 (无数据)`)
  }
  
  // 迁移网站配置
  const siteConfig = readJson('site-config.json')
  if (siteConfig && Object.keys(siteConfig).length > 0) {
    const json = JSON.stringify(siteConfig)
    
    const existing = db.exec(`SELECT id FROM contents WHERE content_type = 'site_config' AND content_key = 'main'`)
    
    if (existing.length > 0 && existing[0].values.length > 0) {
      db.run(`UPDATE contents SET draft_data = ?, published_data = ?, updated_at = ? WHERE content_type = 'site_config' AND content_key = 'main'`,
        [json, json, now])
    } else {
      db.run(`INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, created_at, updated_at, published_at)
        VALUES ('site_config', 'main', ?, ?, 'published', 1, ?, ?, ?)`,
        [json, json, now, now, now])
    }
    console.log(`✅ 迁移了网站配置`)
  } else {
    console.log(`⏭️  跳过网站配置迁移 (无数据)`)
  }
  
  // 统计
  const stats = db.exec(`
    SELECT content_type, COUNT(*) as count 
    FROM contents 
    WHERE status != 'deleted' 
    GROUP BY content_type
  `)
  
  console.log('\n📊 迁移统计:')
  if (stats.length > 0 && stats[0].values.length > 0) {
    stats[0].values.forEach(row => {
      console.log(`   - ${row[0]}: ${row[1]} 条`)
    })
  }
  
  // 保存数据库
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(dbPath, buffer)
  
  console.log('\n🎉 数据迁移完成！')
  console.log(`📁 数据库位置: ${dbPath}`)
  
  db.close()
}

migrate().catch(console.error)
