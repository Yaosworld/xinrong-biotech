/**
 * 将静态 banners.json 数据导入到数据库
 * 
 * 用法: node import_banner_data.js
 * 在服务器上运行: cd /www/wwwroot/biotech-api && node import_banner_data.js
 */

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

// 数据库路径
const dbPath = process.env.DB_PATH || path.join(__dirname, 'data/cms.db')
console.log('数据库路径:', dbPath)

// 静态 JSON 文件路径（按优先级）
const staticJsonPaths = [
  '/www/wwwroot/biotech/data/banners.json',
  path.join(__dirname, '../public/data/banners.json'),
  path.join(__dirname, 'public/data/banners.json')
]

try {
  // 1. 查找静态 JSON 文件
  let jsonPath = null
  let jsonData = null
  
  for (const p of staticJsonPaths) {
    if (fs.existsSync(p)) {
      jsonPath = p
      jsonData = JSON.parse(fs.readFileSync(p, 'utf-8'))
      console.log(`✅ 找到静态 JSON: ${p}`)
      break
    }
  }
  
  if (!jsonData) {
    console.log('❌ 没有找到静态 banners.json 文件')
    console.log('   请确保文件存在于以下路径之一:')
    staticJsonPaths.forEach(p => console.log(`   - ${p}`))
    process.exit(1)
  }
  
  // 2. 连接数据库
  const db = new Database(dbPath)
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  
  console.log('\n开始导入 banner 数据...\n')
  
  // 3. 导入每个 banner
  const bannerKeys = Object.keys(jsonData)
  let importedCount = 0
  let updatedCount = 0
  
  for (const key of bannerKeys) {
    const data = jsonData[key]
    const draftData = JSON.stringify(data)
    
    // 检查是否已存在
    const existing = db.prepare(`
      SELECT id FROM contents WHERE content_type = 'banner' AND content_key = ?
    `).get(key)
    
    if (existing) {
      // 更新现有记录
      db.prepare(`
        UPDATE contents 
        SET draft_data = ?, published_data = ?, status = 'published', 
            version = version + 1, updated_at = ?, published_at = ?
        WHERE content_type = 'banner' AND content_key = ?
      `).run(draftData, draftData, now, now, key)
      
      console.log(`📝 更新: ${key}`)
      console.log(`   - 标语: ${data.slogans?.length || 0} 条`)
      console.log(`   - 统计项: ${data.defaultStats?.length || 0} 个`)
      updatedCount++
    } else {
      // 插入新记录
      const maxOrder = db.prepare(`
        SELECT MAX(sort_order) as max FROM contents WHERE content_type = 'banner'
      `).get()
      const sortOrder = (maxOrder?.max || 0) + 1
      
      db.prepare(`
        INSERT INTO contents (content_type, content_key, draft_data, published_data, 
                              status, version, sort_order, created_at, updated_at, published_at)
        VALUES ('banner', ?, ?, ?, 'published', 1, ?, ?, ?, ?)
      `).run(key, draftData, draftData, sortOrder, now, now, now)
      
      console.log(`✅ 导入: ${key}`)
      console.log(`   - 标语: ${data.slogans?.length || 0} 条`)
      console.log(`   - 统计项: ${data.defaultStats?.length || 0} 个`)
      importedCount++
    }
  }
  
  db.close()
  
  console.log('\n========================================')
  console.log('导入完成!')
  console.log(`  新增: ${importedCount} 条`)
  console.log(`  更新: ${updatedCount} 条`)
  console.log('========================================')
  console.log('\n现在可以刷新后台页面查看 banner 数据了。')
  
} catch (error) {
  console.error('❌ 错误:', error.message)
  process.exit(1)
}
