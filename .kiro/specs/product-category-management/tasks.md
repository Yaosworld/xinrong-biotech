# Implementation Plan

## 1. 后端基础设施

- [ ] 1.1 创建分类服务 categoryService.ts
  - 实现 getAllPublished() 获取已发布分类
  - 实现 generateCategoryId() 生成唯一分类ID
  - 实现 getCategoriesWithCount() 获取分类及产品数量
  - 实现 canDelete() 检查分类是否可删除
  - 实现 detectUndefinedCategories() 检测未定义分类
  - 实现 initDefaultCategories() 初始化默认分类数据
  - _Requirements: 1.4, 1.7, 3.1, 3.2, 4.1, 4.4, 4.5_

- [ ] 1.2 编写 categoryService 属性测试
  - **Property 1: Category ID Uniqueness** - 验证生成的ID唯一性
  - **Property 3: Delete Protection** - 验证有产品关联时删除失败
  - **Property 5: Undefined Category Detection** - 验证未定义分类检测
  - **Property 8: Product Count Accuracy** - 验证产品数量统计准确
  - **Validates: Requirements 1.4, 1.7, 3.1, 3.2, 4.5**

- [ ] 1.3 创建分类API路由
  - 添加 GET /api/admin/category/with-count 获取分类及产品数量
  - 添加 POST /api/admin/category/detect-undefined 检测未定义分类
  - 添加 DELETE /api/admin/content/category/:key 删除分类（带产品检查）
  - 在 server/src/index.ts 中注册路由
  - _Requirements: 1.6, 1.7, 3.2, 4.3_

- [ ] 1.4 修改数据库初始化逻辑
  - 在 initDb() 中调用 initDefaultCategories()
  - 将现有5个分类作为默认数据写入 contents 表
  - _Requirements: 4.1, 4.4_

- [ ] 1.5 Checkpoint - 确保后端测试通过
  - Ensure all tests pass, ask the user if questions arise.

## 2. 前端状态管理

- [ ] 2.1 创建 categoryStore.ts
  - 定义 categories 状态和 loading 状态
  - 实现 loadCategories() 从API加载分类
  - 实现 categoryMap getter 用于快速查找
  - 实现 categoryOptions getter 用于下拉选择
  - 实现 getCategoryById()、getCategoryName()、getCategoryImagePath()
  - 实现 clearCache() 清除缓存
  - _Requirements: 4.3, 5.1, 5.2_

- [ ] 2.2 编写 categoryStore 属性测试
  - **Property 4: Default Image Fallback** - 验证无图片时返回默认图片
  - **Validates: Requirements 2.4**

- [ ] 2.3 重构 useCategoryImage.ts
  - 修改为从 categoryStore 获取分类数据
  - 保持现有函数签名不变以确保向后兼容
  - 添加降级逻辑：store未初始化时使用静态默认值
  - _Requirements: 5.1, 5.3_

- [ ] 2.4 Checkpoint - 确保前端状态管理测试通过
  - Ensure all tests pass, ask the user if questions arise.

## 3. 后台分类管理页面

- [ ] 3.1 创建 CategoryList.vue 分类管理页面
  - 复用 UnifiedTableEditor 组件
  - 配置列：ID、分类图片、名称、描述、产品数量
  - 实现分类的增删改查功能
  - 实现图片上传功能（复用 ImageUploader）
  - 实现删除保护（有产品时禁止删除）
  - _Requirements: 1.2, 1.3, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.5_

- [ ] 3.2 编写 CategoryList 属性测试
  - **Property 2: Category ID Immutability** - 验证编辑后ID不变
  - **Validates: Requirements 1.5**

- [ ] 3.3 修改 AdminLayout.vue 菜单配置
  - 将"产品管理"改为带子菜单的结构
  - 添加"分类管理"子菜单项，路径 /admin/products/categories
  - 添加"产品列表"子菜单项，路径 /admin/products/list
  - _Requirements: 1.1_

- [ ] 3.4 配置路由
  - 在 router/index.ts 中添加分类管理路由
  - 路径: /admin/products/categories
  - _Requirements: 1.1_

- [ ] 3.5 Checkpoint - 确保分类管理页面功能正常
  - Ensure all tests pass, ask the user if questions arise.

## 4. Excel导入联动功能

- [ ] 4.1 创建 NewCategoryDialog.vue 新分类定义弹窗
  - 接收未定义分类列表作为 props
  - 为每个未定义分类显示定义表单（名称、图片上传）
  - 实现确认、跳过、取消三个操作
  - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [ ] 4.2 修改 ExcelProcessor.ts
  - 修改 CATEGORY_MAP 为动态获取（从 categoryStore）
  - 修改 normalizeCategoryId() 支持动态分类
  - 添加 extractCategoryValues() 提取Excel中所有分类值
  - _Requirements: 3.1_

- [ ] 4.3 编写 ExcelProcessor 属性测试
  - **Property 6: Skip Import Fallback** - 验证跳过时分类设为未分类
  - **Validates: Requirements 3.5**

- [ ] 4.4 修改 ProductsList.vue 导入流程
  - 在 handleExcelImport 中添加新分类检测逻辑
  - 检测到新分类时显示 NewCategoryDialog
  - 用户确认后创建分类并继续导入
  - 用户跳过时将产品分类设为"未分类"
  - _Requirements: 3.2, 3.4, 3.5, 3.6_

- [ ] 4.5 Checkpoint - 确保Excel导入联动功能正常
  - Ensure all tests pass, ask the user if questions arise.

## 5. 前台集成

- [ ] 5.1 修改 ProductCenter.vue
  - 从 categoryStore 动态获取分类列表
  - 替换静态 CATEGORIES 引用
  - _Requirements: 5.1, 5.2_

- [ ] 5.2 编写前台筛选属性测试
  - **Property 9: Category Filter Correctness** - 验证筛选结果正确
  - **Validates: Requirements 5.3**

- [ ] 5.3 修改 ProductsList.vue 分类下拉
  - 从 categoryStore 动态获取分类选项
  - 替换静态 CATEGORIES 引用
  - _Requirements: 5.2_

## 6. 发布机制集成

- [ ] 6.1 确保分类支持草稿/发布机制
  - 验证 contentService 对 category 类型的支持
  - 在 CategoryList.vue 中启用发布功能
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6.2 编写发布机制属性测试
  - **Property 10: Draft Isolation** - 验证草稿数据不暴露给前台
  - **Validates: Requirements 6.1, 6.4**

- [ ] 6.3 Final Checkpoint - 确保所有测试通过
  - Ensure all tests pass, ask the user if questions arise.
