// 查看数据库中的数据
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(__dirname, 'data/cms.db');
  const buffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(buffer);
  
  // 检查命令行参数
  const showProducts = process.argv.includes('--products') || process.argv.includes('-p');
  
  if (showProducts) {
    console.log('========================================');
    console.log('产品数据 (contents 表, content_type=product)');
    console.log('========================================\n');
    
    // 统计
    const statsResult = db.exec(`
      SELECT status, COUNT(*) as count 
      FROM contents 
      WHERE content_type = 'product'
      GROUP BY status
    `);
    
    console.log('--- 状态统计 ---');
    if (statsResult.length > 0) {
      statsResult[0].values.forEach(row => {
        console.log(`  ${row[0] || 'NULL'}: ${row[1]}`);
      });
    }
    
    // 前10条记录（非删除状态）
    const prodResult = db.exec(`
      SELECT id, content_key, status, 
             LENGTH(draft_data) as draft_len, 
             LENGTH(published_data) as pub_len,
             created_at
      FROM contents 
      WHERE content_type = 'product' AND status != 'deleted'
      LIMIT 10
    `);
    
    console.log('\n--- 非删除状态的前10条记录 ---');
    
    console.log('\n--- 前10条记录 ---');
    if (prodResult.length > 0) {
      prodResult[0].values.forEach(row => {
        const [id, key, status, draftLen, pubLen, createdAt] = row;
        console.log(`  ID:${id} Key:${key} Status:${status || 'NULL'} Draft:${draftLen || 0}B Pub:${pubLen || 0}B`);
      });
    } else {
      console.log('  (无数据)');
    }
    
    db.close();
    return;
  }
  
  console.log('========================================');
  console.log('1. 分类数据 (contents 表, content_type=category)');
  console.log('========================================\n');
  
  const catResult = db.exec(`
    SELECT id, content_key, draft_data, status, sort_order, created_at, updated_at
    FROM contents 
    WHERE content_type = 'category'
    ORDER BY sort_order
  `);
  
  if (catResult.length > 0) {
    catResult[0].values.forEach(row => {
      const [id, key, draft, status, sortOrder, createdAt, updatedAt] = row;
      console.log(`--- ${key} ---`);
      console.log(`  数据库ID: ${id}`);
      console.log(`  状态: ${status}`);
      console.log(`  排序: ${sortOrder}`);
      console.log(`  创建时间: ${createdAt}`);
      console.log(`  更新时间: ${updatedAt}`);
      if (draft) {
        const data = JSON.parse(draft);
        console.log(`  分类数据:`, JSON.stringify(data, null, 4));
      }
      console.log('');
    });
  }
  
  console.log('\n========================================');
  console.log('2. 分类图片表 (category_images)');
  console.log('========================================\n');
  
  const imgResult = db.exec('SELECT * FROM category_images ORDER BY id');
  if (imgResult.length > 0) {
    console.log('列名:', imgResult[0].columns.join(' | '));
    console.log('-'.repeat(80));
    imgResult[0].values.forEach(row => {
      console.log(row.join(' | '));
    });
  }
  
  db.close();
}

main().catch(console.error);
