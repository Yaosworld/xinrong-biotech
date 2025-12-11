# Requirements Document

## Introduction

本功能旨在为CMS后台管理系统添加产品分类的动态管理能力。当前系统的产品分类是硬编码在前端代码中的静态配置（`useCategoryImage.ts`），管理员无法自行添加、修改或删除分类。本功能将实现：

1. 分类数据的数据库存储和动态管理
2. 后台管理界面中的分类管理功能
3. Excel导入产品时自动检测并提示定义新分类
4. 分类图片的上传和管理

## Glossary

- **Category（分类）**: 产品的分类信息，包含ID、名称、图片等属性
- **CategoryId**: 分类的唯一标识符，格式为 "C" + 数字（如 C01, C02）
- **Category_Image（分类图片）**: 用于在产品中心展示的分类封面图片
- **Excel_Import（Excel导入）**: 管理员通过上传Excel文件批量导入产品数据的功能
- **Undefined_Category（未定义分类）**: Excel中出现但系统中尚未定义的分类名称或ID
- **Admin_Panel（后台管理面板）**: CMS内容管理系统的管理员操作界面

## Requirements

### Requirement 1

**User Story:** As a 管理员, I want to 在后台管理界面中管理产品分类, so that 我可以根据业务需要灵活添加、修改或删除产品分类。

#### Acceptance Criteria

1. WHEN 管理员访问产品管理菜单 THEN THE Admin_Panel SHALL 显示"分类管理"和"产品列表"两个子菜单选项
2. WHEN 管理员进入分类管理页面 THEN THE Admin_Panel SHALL 以表格形式展示所有分类，包含ID、名称、图片、描述、产品数量等字段
3. WHEN 管理员点击新增分类按钮 THEN THE Admin_Panel SHALL 显示分类编辑表单，包含名称（必填）、图片上传、描述等字段
4. WHEN 管理员提交新分类且名称不为空 THEN THE Category SHALL 被创建并自动生成唯一的CategoryId
5. WHEN 管理员编辑现有分类 THEN THE Admin_Panel SHALL 允许修改名称、图片和描述，但CategoryId保持不变
6. WHEN 管理员删除分类且该分类下无关联产品 THEN THE Category SHALL 被删除
7. IF 管理员尝试删除有关联产品的分类 THEN THE Admin_Panel SHALL 阻止删除并提示"该分类下有N个产品，无法删除"

### Requirement 2

**User Story:** As a 管理员, I want to 为每个分类上传和管理图片, so that 产品中心页面可以展示对应的分类封面图。

#### Acceptance Criteria

1. WHEN 管理员在分类表单中点击上传图片 THEN THE Admin_Panel SHALL 打开图片选择器，支持jpg、png、webp格式
2. WHEN 管理员上传分类图片 THEN THE Category_Image SHALL 被存储到服务器的 `/images/products/` 目录
3. WHEN 分类图片上传成功 THEN THE Admin_Panel SHALL 显示图片预览
4. WHEN 分类没有设置图片 THEN THE Category SHALL 使用默认占位图片
5. WHEN 管理员更换分类图片 THEN THE Category_Image SHALL 更新为新图片路径

### Requirement 3

**User Story:** As a 管理员, I want to 在Excel导入产品时自动检测未定义的分类, so that 我可以在导入过程中直接定义新分类而无需切换页面。

#### Acceptance Criteria

1. WHEN 管理员上传产品Excel文件 THEN THE Admin_Panel SHALL 解析文件并检测所有分类字段值
2. WHEN Excel中存在未定义的分类名称或ID THEN THE Admin_Panel SHALL 显示"发现新分类"提示弹窗，列出所有未定义的分类
3. WHEN 显示新分类提示弹窗 THEN THE Admin_Panel SHALL 为每个未定义分类提供快速定义表单（名称、图片上传）
4. WHEN 管理员在弹窗中定义新分类并确认 THEN THE Category SHALL 被创建，且导入流程继续执行
5. WHEN 管理员选择跳过新分类定义 THEN THE Admin_Panel SHALL 将这些产品的分类标记为"未分类"并继续导入
6. WHEN 管理员取消导入 THEN THE Admin_Panel SHALL 中止整个导入流程，不创建任何分类或产品

### Requirement 4

**User Story:** As a 系统, I want to 将分类数据存储在数据库中, so that 分类信息可以被动态管理和持久化。

#### Acceptance Criteria

1. WHEN 系统启动 THEN THE Category SHALL 从数据库加载，而非硬编码配置
2. WHEN 分类数据发生变更 THEN THE Category SHALL 同步更新到数据库
3. WHEN 前台页面请求分类列表 THEN THE Category SHALL 通过API返回数据库中的分类数据
4. WHEN 数据库中无分类数据 THEN THE Category SHALL 使用预设的默认分类进行初始化
5. WHEN 分类被引用（产品使用该分类） THEN THE Category SHALL 记录关联的产品数量

### Requirement 5

**User Story:** As a 前台用户, I want to 在产品中心看到所有分类选项, so that 我可以按分类筛选产品。

#### Acceptance Criteria

1. WHEN 用户访问产品中心页面 THEN THE Category SHALL 从API动态加载，而非使用硬编码列表
2. WHEN 分类列表加载完成 THEN THE Admin_Panel SHALL 在筛选区域显示所有可用分类
3. WHEN 用户选择某个分类进行筛选 THEN THE Category SHALL 正确过滤出该分类下的产品
4. WHEN 某分类下无产品 THEN THE Category SHALL 仍然显示在筛选列表中（可选择性隐藏空分类）

### Requirement 6

**User Story:** As a 管理员, I want to 分类数据支持发布机制, so that 我可以在草稿状态下编辑分类，确认无误后再发布到前台。

#### Acceptance Criteria

1. WHEN 管理员修改分类数据 THEN THE Category SHALL 保存为草稿状态，不影响前台展示
2. WHEN 管理员点击发布按钮 THEN THE Category SHALL 将草稿数据发布为正式数据
3. WHEN 分类数据发布成功 THEN THE Admin_Panel SHALL 显示发布成功提示
4. WHEN 前台请求分类数据 THEN THE Category SHALL 返回已发布的正式数据，而非草稿数据
