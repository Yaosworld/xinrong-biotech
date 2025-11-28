/**
 * ETL 脚本: Excel -> JSON 转换
 * 
 * 用法: npm run generate-json
 * 
 * 功能:
 * - 读取 scripts/raw-data/ 目录下的 Excel 文件
 * - 转换为 JSON 格式
 * - 输出到 public/data/ 目录
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM 模块获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 动态导入 xlsx
const XLSX = await import('xlsx');

// 路径配置
const RAW_DATA_DIR = join(__dirname, 'raw-data');
const OUTPUT_DIR = join(__dirname, '..', 'public', 'data');

// 确保目录存在
function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 创建目录: ${dir}`);
  }
}

// 读取 Excel 文件
function readExcel(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    console.error(`❌ 读取 Excel 失败: ${filePath}`, error.message);
    return null;
  }
}

// 写入 JSON 文件
function writeJson(filePath, data) {
  try {
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 生成 JSON: ${filePath} (${data.length} 条记录)`);
  } catch (error) {
    console.error(`❌ 写入 JSON 失败: ${filePath}`, error.message);
  }
}

// 处理产品数据
function processProducts(data) {
  return data.map((row, index) => ({
    id: row.id || `P${1000 + index}`,
    name: row.name || '',
    categoryId: row.categoryId || '',
    brand: row.brand || undefined,
    sku: row.sku || undefined,
    specs: row.specs || '',
    unit: row.unit || undefined,
    desc: row.desc || '',
    originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined,
    currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
    stock: row.stock ? Number(row.stock) : undefined,
    isOnSale: Boolean(row.isOnSale)
  }));
}

// 处理分类数据
function processCategories(data) {
  return data.map(row => ({
    id: row.id || '',
    name: row.name || '',
    imageName: row.imageName || '',
    description: row.description || ''
  }));
}

// 处理品牌数据
function processBrands(data) {
  return data.map(row => ({
    brand_id: row.brand_id || '',
    show_name: row.show_name || '',
    logo_url: row.logo_url || '',
    category: row.category || undefined,
    route: row.route || null,
    is_own: Boolean(row.is_own),
    description: row.description || undefined,
    country: row.country || undefined,
    is_featured: Boolean(row.is_featured),
    product_count: row.product_count ? Number(row.product_count) : undefined,
    priority: row.priority ? Number(row.priority) : undefined
  }));
}

// 处理促销数据
function processPromotions(data) {
  return data.map((row, index) => ({
    id: row.id || index + 1,
    title: row.title || '',
    summary: row.summary || '',
    description: row.description || undefined,
    image_url: row.image_url || undefined,
    icon_class: row.icon_class || 'fas fa-bullhorn',
    start_date: row.start_date || undefined,
    end_date: row.end_date || undefined,
    original_price: row.original_price ? Number(row.original_price) : undefined,
    current_price: row.current_price ? Number(row.current_price) : undefined,
    discount_badge: row.discount_badge || undefined,
    category: row.category || undefined,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()) : undefined,
    is_featured: Boolean(row.is_featured),
    priority: row.priority ? Number(row.priority) : undefined,
    applicable_products: row.applicable_products || undefined
  }));
}

// 文件处理映射
const FILE_PROCESSORS = {
  'products.xlsx': { processor: processProducts, output: 'products.json' },
  'categories.xlsx': { processor: processCategories, output: 'categories.json' },
  'brands.xlsx': { processor: processBrands, output: 'brands.json' },
  'promotions.xlsx': { processor: processPromotions, output: 'promotions.json' }
};

// 主函数
async function main() {
  console.log('🚀 开始 ETL 处理...\n');

  // 确保输出目录存在
  ensureDir(OUTPUT_DIR);
  ensureDir(RAW_DATA_DIR);

  // 检查原始数据目录
  if (!existsSync(RAW_DATA_DIR)) {
    console.log(`📂 请将 Excel 文件放入: ${RAW_DATA_DIR}`);
    console.log('支持的文件:');
    Object.keys(FILE_PROCESSORS).forEach(file => {
      console.log(`  - ${file}`);
    });
    return;
  }

  // 获取目录中的文件
  const files = readdirSync(RAW_DATA_DIR);
  
  if (files.length === 0) {
    console.log(`📂 ${RAW_DATA_DIR} 目录为空`);
    console.log('请添加以下 Excel 文件:');
    Object.keys(FILE_PROCESSORS).forEach(file => {
      console.log(`  - ${file}`);
    });
    return;
  }

  // 处理每个文件
  let processedCount = 0;
  
  for (const [fileName, config] of Object.entries(FILE_PROCESSORS)) {
    const filePath = join(RAW_DATA_DIR, fileName);
    
    if (existsSync(filePath)) {
      console.log(`📖 处理文件: ${fileName}`);
      
      const rawData = readExcel(filePath);
      if (rawData) {
        const processedData = config.processor(rawData);
        const outputPath = join(OUTPUT_DIR, config.output);
        writeJson(outputPath, processedData);
        processedCount++;
      }
    } else {
      console.log(`⏭️  跳过 (未找到): ${fileName}`);
    }
  }

  console.log(`\n✨ ETL 完成! 处理了 ${processedCount} 个文件`);
}

// 运行
main().catch(console.error);

