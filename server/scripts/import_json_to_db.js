/**
 * 将 public/data/products.json 导入到数据库
 * 运行方式: cd server && node scripts/import_json_to_db.js
 */

const fs = require('fs')
const path = require('path')
const initSqlJs = require('sql.js')

// 路径配置
const JSON_PATH = path.join(__dirname, '../../public/data/products.json')
const DB_PATH = path.join(__dirname, '../data/cms.db')

async function main() {
  console.log('='.repeat(60))
  console.log('JSON 数据导入数据库工具')
  console.log('='.repeat(60))

  // 初始化 sql.js
  const SQL = await initSqlJs()

  // 读取数据库
  console.log(`\n读取数据库: ${DB_PATH}`)
  const dbBuffer = fs.readFileSync(DB_PATH)
  const db = new SQL.Database(dbBuffer)

  // 读取 JSON 数据
  console.log(`\n读取 JSON: ${JSON_PATH}`)
  const products = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'))
  console.log(`  共 ${products.length} 条产品数据`)

  // 删除旧的产品数据
  console.log('\n步骤1: 删除旧的产品数据...')
  db.run("DELETE FROM content_versions WHERE content_id IN (SELECT id FROM contents WHERE content_type = 'product')")
  db.run("DELETE FROM contents WHERE content_type = 'product'")
  console.log('  已删除旧数据')

  // 插入新数据
  console.log('\n步骤2: 插入新数据...')
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)

  for (let i = 0; i < products.length; i++) {
    const product = products[i]
    const productJson = JSON.stringify(product)

    db.run(`
      INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, sort_order, created_at, updated_at, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, ['product', product.id, productJson, productJson, 'published', 1, i + 1, now, now, now])
  }
  console.log(`  已插入 ${products.length} 条数据`)

  // 验证
  console.log('\n步骤3: 验证数据...')
  const result = db.exec("SELECT COUNT(*) FROM contents WHERE content_type = 'product'")
  console.log(`  数据库中产品数量: ${result[0].values[0][0]}`)

  // 保存数据库
  console.log('\n步骤4: 保存数据库...')
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
  console.log('  数据库已保存')

  db.close()

  console.log('\n' + '='.repeat(60))
  console.log('导入完成!')
  console.log('='.repeat(60))
}

main().catch(console.error)
