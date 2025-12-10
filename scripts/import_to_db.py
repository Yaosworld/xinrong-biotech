"""
将转换后的 Excel 文件导入到 SQLite 数据库
"""
import pandas as pd
import sqlite3
import json
import os
from datetime import datetime

# 路径配置
EXCEL_PATH = r'E:\Yaos_Rproj\2025_11_27_XRsimple\public\data\excel'
DB_PATH = r'E:\Yaos_Rproj\2025_11_27_XRsimple\server\data\cms.db'

# 转换后的文件列表
CONVERTED_FILES = [
    '碧云天1_转换后.xlsx',
    '碧云天2_转换后.xlsx',
    '碧云天3_转换后.xlsx',
    '南京建成_转换后.xlsx',
    '百思_转换后.xlsx',
    '特价商品_转换后.xlsx',
    'Abebio ELISA试剂盒_转换后.xlsx',
    'Abebio Monoclonalantibody_转换后.xlsx',
    'Abebio Polyclonal antibody_转换后.xlsx',
    'Abebio食品安全_转换后.xlsx',
    'BIOVIGEN&Takara_转换后.xlsx',
    'kirgen_转换后.xlsx',
    'thermox_转换后.xlsx',
]

def main():
    print("=" * 60)
    print("Excel 数据导入数据库工具")
    print("=" * 60)
    
    # 连接数据库
    print(f"\n连接数据库: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. 删除旧的产品数据
    print("\n步骤1: 删除旧的产品数据...")
    cursor.execute("DELETE FROM content_versions WHERE content_id IN (SELECT id FROM contents WHERE content_type = 'product')")
    cursor.execute("DELETE FROM contents WHERE content_type = 'product'")
    deleted = cursor.rowcount
    print(f"  已删除 {deleted} 条旧数据")
    conn.commit()
    
    # 2. 读取所有 Excel 文件
    print("\n步骤2: 读取 Excel 文件...")
    all_products = []
    
    for filename in CONVERTED_FILES:
        filepath = os.path.join(EXCEL_PATH, filename)
        if not os.path.exists(filepath):
            print(f"  跳过 (不存在): {filename}")
            continue
        
        df = pd.read_excel(filepath)
        # 将 NaN 替换为空字符串或默认值
        df = df.fillna('')
        products = df.to_dict('records')
        all_products.extend(products)
        print(f"  读取: {filename} ({len(products)} 条)")
    
    print(f"\n  总计: {len(all_products)} 条产品数据")
    
    # 3. 重新生成连续的 ID
    print("\n步骤3: 重新生成产品 ID...")
    for i, product in enumerate(all_products):
        product['id'] = f'P{str(i+1).zfill(5)}'
    
    # 4. 插入数据库
    print("\n步骤4: 插入数据库...")
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    inserted = 0
    for i, product in enumerate(all_products):
        # 转换为 JSON
        product_json = json.dumps(product, ensure_ascii=False)
        
        # 插入 contents 表
        cursor.execute("""
            INSERT INTO contents (content_type, content_key, draft_data, published_data, status, version, sort_order, created_at, updated_at, published_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'product',
            product['id'],
            product_json,
            product_json,
            'published',
            1,
            i + 1,
            now,
            now,
            now
        ))
        inserted += 1
        
        # 每 1000 条提交一次
        if inserted % 1000 == 0:
            conn.commit()
            print(f"  已插入 {inserted} 条...")
    
    conn.commit()
    print(f"  完成! 共插入 {inserted} 条数据")
    
    # 5. 验证
    print("\n步骤5: 验证数据...")
    cursor.execute("SELECT COUNT(*) FROM contents WHERE content_type = 'product'")
    count = cursor.fetchone()[0]
    print(f"  数据库中产品数量: {count}")
    
    # 显示前5条
    cursor.execute("SELECT content_key, published_data FROM contents WHERE content_type = 'product' LIMIT 5")
    rows = cursor.fetchall()
    print("\n  前5条数据预览:")
    for row in rows:
        data = json.loads(row[1])
        print(f"    {data['id']}: {data['name'][:30]}... ({data['brand']})")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print("导入完成!")
    print("=" * 60)

if __name__ == '__main__':
    main()
