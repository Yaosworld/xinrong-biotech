/**
 * 促销图片 API 测试脚本
 * 
 * 运行方式: node check_promotion_image_api.js
 */

const BASE_URL = 'http://localhost:3000'

async function testAPI() {
  console.log('=== 促销图片 API 测试 ===\n')
  
  // 1. 测试同步文件系统
  console.log('1. 测试同步文件系统...')
  try {
    const syncRes = await fetch(`${BASE_URL}/api/admin/promotion-images/sync`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer test-token' }
    })
    const syncData = await syncRes.json()
    console.log('   同步结果:', syncData)
  } catch (e) {
    console.log('   同步失败:', e.message)
  }
  
  // 2. 测试获取封面图片列表
  console.log('\n2. 测试获取封面图片列表...')
  try {
    const coversRes = await fetch(`${BASE_URL}/api/admin/promotion-images/covers`, {
      headers: { 'Authorization': 'Bearer test-token' }
    })
    console.log('   HTTP状态:', coversRes.status)
    const coversData = await coversRes.json()
    console.log('   响应:', JSON.stringify(coversData).substring(0, 200))
    console.log('   封面图片数量:', coversData.data?.length || 0)
    if (coversData.data?.length > 0) {
      console.log('   示例:', coversData.data[0])
    }
  } catch (e) {
    console.log('   获取失败:', e.message)
  }
  
  // 3. 测试获取海报图片列表
  console.log('\n3. 测试获取海报图片列表...')
  try {
    const postersRes = await fetch(`${BASE_URL}/api/admin/promotion-images/posters`, {
      headers: { 'Authorization': 'Bearer test-token' }
    })
    const postersData = await postersRes.json()
    console.log('   海报图片数量:', postersData.data?.length || 0)
    if (postersData.data?.length > 0) {
      console.log('   示例:', postersData.data[0])
    }
  } catch (e) {
    console.log('   获取失败:', e.message)
  }
  
  // 4. 测试获取所有图片
  console.log('\n4. 测试获取所有图片...')
  try {
    const allRes = await fetch(`${BASE_URL}/api/admin/promotion-images/list`, {
      headers: { 'Authorization': 'Bearer test-token' }
    })
    const allData = await allRes.json()
    console.log('   总图片数量:', allData.data?.length || 0)
  } catch (e) {
    console.log('   获取失败:', e.message)
  }
  
  console.log('\n=== 测试完成 ===')
}

testAPI().catch(console.error)
