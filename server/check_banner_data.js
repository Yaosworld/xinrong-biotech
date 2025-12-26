/**
 * 检查 Banner 数据
 * 
 * 在服务器运行: cd /www/wwwroot/biotech-api && node check_banner_data.js
 */

const Database = require('better-sqlite3')
const path = require('path')
const http = require('http')

const dbPath = process.env.DB_PATH || path.join(__dirname, 'data/cms.db')

console.log('=== 1. 数据库查询 ===')
console.log('数据库:', dbPath)

const db = new Database(dbPath)

// 查询 banner 数据
const rows = db.prepare(`
  SELECT content_key, status, version, draft_data, published_data 
  FROM contents WHERE content_type = 'banner'
`).all()

console.log(`\n找到 ${rows.length} 条 banner 记录:`)
rows.forEach(r => {
  const draft = r.draft_data ? JSON.parse(r.draft_data) : null
  const pub = r.published_data ? JSON.parse(r.published_data) : null
  console.log(`\n[${r.content_key}] 状态:${r.status} 版本:${r.version}`)
  console.log(`  草稿: ${draft ? `${draft.slogans?.length||0}条标语, ${draft.defaultStats?.length||0}个统计` : '无'}`)
  console.log(`  发布: ${pub ? `${pub.slogans?.length||0}条标语, ${pub.defaultStats?.length||0}个统计` : '无'}`)
  if (pub?.slogans?.length) console.log(`  标语: ${pub.slogans[0]}`)
})

db.close()

// 测试 API
console.log('\n=== 2. API 测试 ===')

const testApi = (path, desc) => {
  return new Promise(resolve => {
    const req = http.get(`http://localhost:3000${path}`, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log(`\n${desc}: ${res.statusCode}`)
        try {
          const json = JSON.parse(data)
          console.log(JSON.stringify(json, null, 2).slice(0, 500))
        } catch { console.log(data.slice(0, 200)) }
        resolve()
      })
    })
    req.on('error', e => { console.log(`${desc}: 错误 - ${e.message}`); resolve() })
  })
}

;(async () => {
  await testApi('/api/content/banner/products/published', '前台API (products)')
  await testApi('/api/admin/content/banner/products', '后台API (products) - 需要token')
})()

