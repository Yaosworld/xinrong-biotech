// 模拟 categoryImageService.getAll() 的返回
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/cms.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  const UPLOAD_BASE = path.join(__dirname, 'uploads');
  const CATEGORY_IMAGE_DIR = 'images/products';
  
  // 获取所有图片
  const rows = db.exec(`
    SELECT 
      id,
      filename,
      original_name as originalName,
      path,
      created_at as createdAt
    FROM category_images
    ORDER BY created_at DESC
  `);
  
  console.log('=== categoryImageService.getAll() 返回的数据 ===\n');
  
  if (rows.length > 0) {
    const columns = rows[0].columns;
    rows[0].values.forEach(row => {
      const obj = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      
      const uploadPath = path.join(UPLOAD_BASE, CATEGORY_IMAGE_DIR, obj.filename);
      const isUploaded = fs.existsSync(uploadPath);
      const url = isUploaded 
        ? `/uploads/${CATEGORY_IMAGE_DIR}/${obj.filename}`
        : `/images/products/${obj.filename}`;
      
      console.log(`ID ${obj.id}: ${obj.filename}`);
      console.log(`  isUploaded: ${isUploaded}`);
      console.log(`  url: ${url}`);
      console.log('');
    });
  }
  
  db.close();
}

main().catch(console.error);
