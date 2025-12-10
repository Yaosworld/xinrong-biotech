"""
Excel 产品数据转换脚本
将原始 Excel 格式转换为系统需要的格式
"""
import pandas as pd
import os

# 输入输出路径
INPUT_FILE = r'E:\Yaos_Rproj\2025_11_27_XRsimple\public\data\excel\碧云天1（已完成）.xlsx'
OUTPUT_FILE = r'E:\Yaos_Rproj\2025_11_27_XRsimple\public\data\excel\碧云天1_转换后.xlsx'

# 读取原始 Excel
print(f"读取文件: {INPUT_FILE}")
df = pd.read_excel(INPUT_FILE)
print(f"原始数据: {len(df)} 行")
print(f"原始列: {list(df.columns)}")

# 创建新的 DataFrame
new_df = pd.DataFrame()

# 生成 ID (从 P001 开始)
new_df['id'] = [f'P{str(i+1).zfill(5)}' for i in range(len(df))]

# 映射列
new_df['name'] = df['名称'].fillna('')
new_df['sku'] = df['货号'].fillna('')
new_df['brand'] = df['品牌'].fillna('')
new_df['categoryId'] = 'C03'  # 全部归类为实验试剂
new_df['specs'] = df['规格'].fillna('')
new_df['unit'] = df['单位'].fillna('')
new_df['desc'] = '暂无'  # 描述填写"暂无"

# 调整列顺序（与系统表格一致）
column_order = ['id', 'name', 'sku', 'brand', 'categoryId', 'specs', 'unit', 'desc']
new_df = new_df[column_order]

# 保存转换后的文件
print(f"\n保存到: {OUTPUT_FILE}")
new_df.to_excel(OUTPUT_FILE, index=False)
print(f"转换完成! 共 {len(new_df)} 条数据")

# 显示前5行预览
print("\n转换后数据预览:")
print(new_df.head().to_string())
