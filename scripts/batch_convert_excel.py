"""
批量 Excel 产品数据转换脚本
将原始 Excel 格式转换为系统需要的格式
"""
import pandas as pd
import os

BASE_PATH = r'E:\Yaos_Rproj\2025_11_27_XRsimple\public\data\excel'

# 需要转换的文件列表
FILES_TO_CONVERT = [
    '百思（已完成）.xls',
    '特价商品（已完成）.xls',
    'Abebio ELISA试剂盒（已完成）.xls',
    'Abebio Monoclonalantibody（已完成）.xls',
    'Abebio Polyclonal antibody（已完成）.xls',
    'Abebio食品安全（已完成）.xls',
    'BIOVIGEN&Takara（已完成）.xls',
    'kirgen（已完成）.xls',
    'thermo（已完成）.xlsx',
]

# 列名映射（原始列名 -> 目标列名）
COLUMN_MAPPING = {
    '货号': 'sku',
    '名称': 'name',
    '品牌': 'brand',
    '单位': 'unit',
    '规格': 'specs',
    # 以下列会被忽略
    '分类': None,
    '销售价(元)': None,
    '销售价': None,
    '价格': None,
}

def analyze_file(filepath):
    """分析文件结构"""
    try:
        df = pd.read_excel(filepath)
        return {
            'columns': list(df.columns),
            'rows': len(df),
            'df': df
        }
    except Exception as e:
        return {'error': str(e)}

def convert_file(filepath, output_path, start_id=1):
    """转换单个文件"""
    result = analyze_file(filepath)
    if 'error' in result:
        print(f"  错误: {result['error']}")
        return 0, start_id
    
    df = result['df']
    print(f"  原始列: {result['columns']}")
    print(f"  行数: {result['rows']}")
    
    # 创建新 DataFrame
    new_df = pd.DataFrame()
    
    # 生成 ID
    new_df['id'] = [f'P{str(start_id + i).zfill(5)}' for i in range(len(df))]
    
    # 映射已知列
    for orig_col, new_col in COLUMN_MAPPING.items():
        if orig_col in df.columns and new_col:
            new_df[new_col] = df[orig_col].fillna('')
    
    # 处理可能的列名变体
    if 'name' not in new_df.columns:
        for col in ['产品名称', '商品名称', '名称']:
            if col in df.columns:
                new_df['name'] = df[col].fillna('')
                break
    
    if 'sku' not in new_df.columns:
        for col in ['货号', '产品货号', '编号', 'SKU']:
            if col in df.columns:
                new_df['sku'] = df[col].fillna('')
                break
    
    if 'brand' not in new_df.columns:
        for col in ['品牌', '厂家', '供应商']:
            if col in df.columns:
                new_df['brand'] = df[col].fillna('')
                break
    
    if 'specs' not in new_df.columns:
        for col in ['规格', '规格型号', '包装规格']:
            if col in df.columns:
                new_df['specs'] = df[col].fillna('')
                break
    
    if 'unit' not in new_df.columns:
        for col in ['单位', '计量单位']:
            if col in df.columns:
                new_df['unit'] = df[col].fillna('')
                break
    
    # 设置默认值
    new_df['categoryId'] = 'C03'  # 实验试剂
    new_df['desc'] = '暂无'
    
    # 确保所有必需列存在
    for col in ['name', 'sku', 'brand', 'specs', 'unit']:
        if col not in new_df.columns:
            new_df[col] = ''
    
    # 调整列顺序
    column_order = ['id', 'name', 'sku', 'brand', 'categoryId', 'specs', 'unit', 'desc']
    new_df = new_df[column_order]
    
    # 保存
    new_df.to_excel(output_path, index=False)
    print(f"  保存到: {output_path}")
    
    return len(df), start_id + len(df)

def main():
    print("=" * 60)
    print("批量 Excel 转换工具")
    print("=" * 60)
    
    total_rows = 0
    current_id = 1
    
    for filename in FILES_TO_CONVERT:
        input_path = os.path.join(BASE_PATH, filename)
        
        # 生成输出文件名
        base_name = filename.replace('（已完成）', '').replace('.xls', '').replace('.xlsx', '')
        output_name = f"{base_name}_转换后.xlsx"
        output_path = os.path.join(BASE_PATH, output_name)
        
        print(f"\n处理: {filename}")
        
        if not os.path.exists(input_path):
            print(f"  文件不存在，跳过")
            continue
        
        # 检查是否已转换
        if os.path.exists(output_path):
            print(f"  已存在转换文件，跳过")
            continue
        
        rows, current_id = convert_file(input_path, output_path, current_id)
        total_rows += rows
    
    print("\n" + "=" * 60)
    print(f"转换完成! 共处理 {total_rows} 条数据")
    print("=" * 60)

if __name__ == '__main__':
    main()
