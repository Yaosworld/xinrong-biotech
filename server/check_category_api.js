// 检查前台分类API返回的数据
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/cms.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  console.log('=== 前台 API 返回的分类数据 (/api/content/category/published) ===\n');
  
  const result = db.exec(`
    SELECT published_data FROM contents 
    WHERE content_type = 'category' AND status = 'published' AND published_data IS NOT NULL
    ORDER BY sort_order ASC, id ASC
  `);
  
  if (result.length > 0) {
    result[0].values.forEach(row => {
      const data = JSON.parse(row[0]);
      console.log(JSON.stringify(data, null, 2));
      console.log('---');
    });
  }
  
  db.close();
}

main().catch(console.error);
