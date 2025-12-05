import json
import pathlib
import os

# 定义文件路径
file_path = r"E:\Yaos_Rproj\2025_11_27_XRsimple\public\data\products.json"

# 读取文件
try:
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Error: File not found at {file_path}")
    exit(1)

# 定义ID集合
cell_culture_ids = {f'P{str(i).zfill(3)}' for i in range(1, 13)} # P001-P012
molecular_enzyme_ids = {'P013', 'P016'} # 酶
molecular_electrophoresis_ids = {f'P{str(i).zfill(3)}' for i in range(46, 51)} # P046-P050
instrument_ids = {f'P{str(i).zfill(3)}' for i in range(24, 28)} # P024-P027
consumable_ids = {f'P{str(i).zfill(3)}' for i in range(33, 43)} # P033-P042

# 剩余的归为 C03 (生物试剂)，包括 PCR 混合液、抗体、化学试剂、提取试剂盒
# PCR混合液/Buffer/dNTPs: P014, P015, P017, P018
# 抗体: P019-P023
# 化学试剂: P028-P032
# 提取试剂盒: P043-P045

for item in data:
    pid = item['id']
    
    if pid in instrument_ids:
        item['categoryId'] = 'C01' # 精密仪器
    elif pid in consumable_ids:
        item['categoryId'] = 'C02' # 实验耗材
    elif pid in cell_culture_ids:
        item['categoryId'] = 'C04' # 细胞培养
    elif pid in molecular_enzyme_ids or pid in molecular_electrophoresis_ids:
        item['categoryId'] = 'C05' # 分子生物学 (酶、电泳)
    else:
        # 剩下的都归为 C03 生物试剂 (抗体、通用试剂、提取盒、PCR Mix)
        item['categoryId'] = 'C03'

# 写入文件
with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    
print("Successfully updated product categories.")

