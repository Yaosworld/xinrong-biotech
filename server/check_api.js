// 检查 API 返回的数据
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/cms.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // 模拟 categoryService.getCategoriesWithCount 的逻辑
  
  // 1. 获取所有图片
  const imageRows = db.exec('SELECT id, filename FROM category_images');
  const imageMap = new Map();
  if (imageRows.length > 0) {
    imageRows[0].values.forEach(([id, filename]) => {
      imageMap.set(id, filename);
    });
  }
  console.log('=== Image Map (id -> filename) ===');
  console.log(Object.fromEntries(imageMap));
  
  // 2. 获取分类数据
  const catResult = db.exec(`
    SELECT draft_data, published_data 
    FROM contents 
    WHERE content_type = 'category' AND status != 'deleted'
    ORDER BY sort_order ASC, id ASC
  `);
  
  console.log('\n=== Category Data with Image URLs ===');
  
  const UPLOAD_BASE = path.join(__dirname, 'uploads');
  
  if (catResult.length > 0) {
    catResult[0].values.forEach(([draft, published]) => {
      const data = draft || published;
      if (data) {
        const cat = JSON.parse(data);
        
        let imageUrl = '/images/common/placeholder.png';
        let imageName = '';
        
        if (cat.imageId) {
          // 新方式：通过 imageId 获取图片
          imageName = imageMap.get(cat.imageId) || '';
        } else if (cat.imageName) {
          // 旧方式：直接使用 imageName
          imageName = cat.imageName;
        }
        
        // 根据图片是否在 uploads 目录来决定 URL
        if (imageName) {
          const uploadPath = path.join(UPLOAD_BASE, 'images/products', imageName);
          const existsInUploads = fs.existsSync(uploadPath);
          
          if (existsInUploads) {
            imageUrl = `/uploads/images/products/${imageName}`;
          } else {
            // 预设图片在 public 目录
            imageUrl = `/images/products/${imageName}`;
          }
          
          console.log(`\n${cat.id} (${cat.name}):`);
          console.log(`  imageId: ${cat.imageId || 'null'}`);
          console.log(`  imageName from DB: ${cat.imageName || 'null'}`);
          console.log(`  resolved imageName: ${imageName}`);
          console.log(`  uploadPath: ${uploadPath}`);
          console.log(`  existsInUploads: ${existsInUploads}`);
          console.log(`  final imageUrl: ${imageUrl}`);
        } else {
          console.log(`\n${cat.id} (${cat.name}):`);
          console.log(`  imageId: ${cat.imageId || 'null'}`);
          console.log(`  imageName: null`);
          console.log(`  final imageUrl: ${imageUrl} (placeholder)`);
        }
      }
    });
  }
  
  // 检查 uploads 目录
  console.log('\n\n=== Files in uploads/images/products ===');
  const uploadsDir = path.join(UPLOAD_BASE, 'images/products');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log(files);
  } else {
    console.log('Directory does not exist:', uploadsDir);
  }
  
  // 检查 public 目录
  console.log('\n=== Files in public/images/products ===');
  const publicDir = path.join(__dirname, '../public/images/products');
  if (fs.existsSync(publicDir)) {
    const files = fs.readdirSync(publicDir);
    console.log(files);
  } else {
    console.log('Directory does not exist:', publicDir);
  }
  
  // 模拟完整的 API 返回
  console.log('\n\n=== 模拟 /api/admin/category/with-count 返回 ===');
  
  const apiResult = [];
  if (catResult.length > 0) {
    catResult[0].values.forEach(([draft, published]) => {
      const data = draft || published;
      if (data) {
        const cat = JSON.parse(data);
        
        let imageUrl = '/images/common/placeholder.png';
        let imageName = '';
        
        if (cat.imageId) {
          imageName = imageMap.get(cat.imageId) || '';
        } else if (cat.imageName) {
          imageName = cat.imageName;
        }
        
        if (imageName) {
          const uploadPath = path.join(UPLOAD_BASE, 'images/products', imageName);
          const existsInUploads = fs.existsSync(uploadPath);
          
          if (existsInUploads) {
            imageUrl = `/uploads/images/products/${imageName}`;
          } else {
            imageUrl = `/images/products/${imageName}`;
          }
        }
        
        apiResult.push({
          id: cat.id,
          name: cat.name,
          imageId: cat.imageId || null,
          description: cat.description || '',
          imageUrl,
          imageName,
          productCount: 0
        });
      }
    });
  }
  
  console.log(JSON.stringify(apiResult, null, 2));
  
  db.close();
}

main().catch(console.error);
