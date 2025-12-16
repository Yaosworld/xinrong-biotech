/**
 * 检查品牌图片 API 返回的数据
 */
const path = require('path')

// 设置环境变量
process.env.DATABASE_PATH = path.join(__dirname, 'data/cms.db')

async function main() {
  // 初始化数据库 (异步)
  const db = require('./dist/db').default
  await db.initDb()

  // 动态导入服务
  const { brandImageService } = require('./dist/services/brandImageService')

  console.log('=== brandImageService.getAll("logo") 返回的数据 ===\n')

  const logoImages = brandImageService.getAll('logo')
  logoImages.forEach(img => {
    console.log(`ID ${img.id}: ${img.filename}`)
    console.log(`  imageType: ${img.imageType}`)
    console.log(`  url: ${img.url}`)
    console.log(`  usageCount: ${img.usageCount}`)
    console.log('')
  })

  console.log('\n=== brandImageService.getAll("certificate") 返回的数据 ===\n')

  const certImages = brandImageService.getAll('certificate')
  certImages.forEach(img => {
    console.log(`ID ${img.id}: ${img.filename}`)
    console.log(`  imageType: ${img.imageType}`)
    console.log(`  url: ${img.url}`)
    console.log(`  usageCount: ${img.usageCount}`)
    console.log('')
  })
}

main().catch(console.error)
