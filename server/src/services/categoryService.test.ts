/**
 * categoryService 属性测试
 * 
 * **Feature: product-category-management**
 * 使用 fast-check 进行属性测试，验证分类服务的核心功能
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import * as fc from 'fast-check'
import { categoryService, DEFAULT_CATEGORIES, CategoryData } from './categoryService'
import { contentService } from './contentService'
import db from '../db'
import fs from 'fs'
import path from 'path'

// 测试数据库路径
const testDbPath = path.join(__dirname, '../../data/test-cms.db')

// 清理测试数据库
function cleanupTestDb() {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath)
  }
}

// 初始化测试数据库
async function initTestDb() {
  cleanupTestDb()
  await db.initDb()
}

// 清空分类数据
function clearCategories() {
  db.run(`DELETE FROM contents WHERE content_type = 'category'`)
}

// 清空产品数据
function clearProducts() {
  db.run(`DELETE FROM contents WHERE content_type = 'product'`)
}

// 添加测试产品
function addTestProduct(categoryId: string, productId: string) {
  const data = JSON.stringify({ id: productId, name: `Test Product ${productId}`, categoryId })
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  db.run(`
    INSERT INTO contents (content_type, content_key, draft_data, published_data, status, created_at, updated_at, published_at)
    VALUES ('product', ?, ?, ?, 'published', ?, ?, ?)
  `, [productId, data, data, now, now, now])
}

describe('categoryService 属性测试', () => {
  beforeAll(async () => {
    await initTestDb()
  })

  beforeEach(() => {
    clearCategories()
    clearProducts()
  })

  afterAll(() => {
    // 可选：清理测试数据库
    // cleanupTestDb()
  })

  /**
   * **Feature: product-category-management, Property 1: Category ID Uniqueness**
   * *For any* sequence of category creation operations, each generated CategoryId 
   * SHALL be unique and not conflict with any existing CategoryId in the system.
   * **Validates: Requirements 1.4**
   */
  describe('Property 1: Category ID Uniqueness', () => {
    it('生成的分类ID应该唯一', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // 生成1-50个分类
          (count) => {
            clearCategories()
            
            const generatedIds = new Set<string>()
            
            for (let i = 0; i < count; i++) {
              const id = categoryService.generateCategoryId()
              
              // 验证ID不重复
              expect(generatedIds.has(id)).toBe(false)
              generatedIds.add(id)
              
              // 创建分类以占用该ID
              const data = JSON.stringify({ id, name: `Category ${i}`, imageName: 'test.png' })
              const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
              db.run(`
                INSERT INTO contents (content_type, content_key, draft_data, published_data, status, created_at, updated_at)
                VALUES ('category', ?, ?, ?, 'published', ?, ?)
              `, [id, data, data, now, now])
            }
            
            // 验证所有ID都是唯一的
            expect(generatedIds.size).toBe(count)
            return true
          }
        ),
        { numRuns: 20 }
      )
    }, 15000)

    it('生成的ID格式应该正确 (C + 数字)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          (count) => {
            clearCategories()
            
            for (let i = 0; i < count; i++) {
              const id = categoryService.generateCategoryId()
              
              // 验证ID格式
              expect(id).toMatch(/^C\d+$/)
              
              // 创建分类
              const data = JSON.stringify({ id, name: `Category ${i}`, imageName: 'test.png' })
              const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
              db.run(`
                INSERT INTO contents (content_type, content_key, draft_data, status, created_at, updated_at)
                VALUES ('category', ?, ?, 'draft', ?, ?)
              `, [id, data, now, now])
            }
            
            return true
          }
        ),
        { numRuns: 20 }
      )
    })
  })

  /**
   * **Feature: product-category-management, Property 3: Delete Protection for Categories with Products**
   * *For any* category that has one or more associated products, the delete operation 
   * SHALL fail and return an error indicating the product count.
   * **Validates: Requirements 1.7**
   */
  describe('Property 3: Delete Protection', () => {
    it('有产品关联的分类不能删除', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // 产品数量
          (productCount) => {
            clearCategories()
            clearProducts()
            
            // 创建一个分类
            const categoryId = 'C99'
            const catData = JSON.stringify({ id: categoryId, name: 'Test Category', imageName: 'test.png' })
            const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
            db.run(`
              INSERT INTO contents (content_type, content_key, draft_data, published_data, status, created_at, updated_at)
              VALUES ('category', ?, ?, ?, 'published', ?, ?)
            `, [categoryId, catData, catData, now, now])
            
            // 添加产品
            for (let i = 0; i < productCount; i++) {
              addTestProduct(categoryId, `P${i + 1}`)
            }
            
            // 检查是否可以删除
            const result = categoryService.canDelete(categoryId)
            
            expect(result.canDelete).toBe(false)
            expect(result.productCount).toBe(productCount)
            
            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('没有产品关联的分类可以删除', () => {
      clearCategories()
      clearProducts()
      
      // 创建一个分类
      const categoryId = 'C99'
      const catData = JSON.stringify({ id: categoryId, name: 'Test Category', imageName: 'test.png' })
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      db.run(`
        INSERT INTO contents (content_type, content_key, draft_data, published_data, status, created_at, updated_at)
        VALUES ('category', ?, ?, ?, 'published', ?, ?)
      `, [categoryId, catData, catData, now, now])
      
      const result = categoryService.canDelete(categoryId)
      
      expect(result.canDelete).toBe(true)
      expect(result.productCount).toBe(0)
    })
  })


  /**
   * **Feature: product-category-management, Property 5: Undefined Category Detection**
   * *For any* list of category values from Excel import, the detectUndefinedCategories function 
   * SHALL correctly identify all values that do not match any existing category ID or name.
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('Property 5: Undefined Category Detection', () => {
    it('应该正确检测未定义的分类', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 20 }),
          (randomValues) => {
            clearCategories()
            
            // 初始化默认分类
            categoryService.initDefaultCategories()
            
            const existingCategories = categoryService.getAllPublished()
            const existingIds = new Set(existingCategories.map(c => c.id))
            const existingNames = new Set(existingCategories.map(c => c.name))
            
            // 混合已存在和不存在的值
            const testValues = [
              ...randomValues,
              ...existingCategories.slice(0, 2).map(c => c.id),
              ...existingCategories.slice(0, 2).map(c => c.name)
            ]
            
            const undefinedCategories = categoryService.detectUndefinedCategories(testValues)
            
            // 验证：返回的未定义分类都不在已存在的ID或名称中
            for (const value of undefinedCategories) {
              expect(existingIds.has(value)).toBe(false)
              expect(existingNames.has(value)).toBe(false)
            }
            
            // 验证：所有不在已存在列表中的值都被检测出来
            const expectedUndefined = new Set(
              randomValues.filter(v => v && !existingIds.has(v.trim()) && !existingNames.has(v.trim()))
            )
            
            for (const value of expectedUndefined) {
              expect(undefinedCategories).toContain(value.trim())
            }
            
            return true
          }
        ),
        { numRuns: 20 }
      )
    })

    it('空值和重复值应该被正确处理', () => {
      clearCategories()
      categoryService.initDefaultCategories()
      
      const testValues = ['', '  ', 'C01', 'C01', '新分类', '新分类', null as any, undefined as any]
      const undefinedCategories = categoryService.detectUndefinedCategories(testValues)
      
      // 空值不应该出现在结果中
      expect(undefinedCategories).not.toContain('')
      expect(undefinedCategories).not.toContain('  ')
      
      // 已存在的分类不应该出现
      expect(undefinedCategories).not.toContain('C01')
      
      // 新分类应该只出现一次
      const newCategoryCount = undefinedCategories.filter(c => c === '新分类').length
      expect(newCategoryCount).toBeLessThanOrEqual(1)
    })
  })

  /**
   * **Feature: product-category-management, Property 8: Product Count Accuracy**
   * *For any* category, the productCount field SHALL equal the actual count of products 
   * in the database that reference that category's ID.
   * **Validates: Requirements 4.5**
   */
  describe('Property 8: Product Count Accuracy', () => {
    it('产品数量统计应该准确', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              categoryIndex: fc.integer({ min: 0, max: 4 }), // 5个默认分类
              productCount: fc.integer({ min: 0, max: 5 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (distributions) => {
            clearCategories()
            clearProducts()
            
            // 初始化默认分类
            categoryService.initDefaultCategories()
            const categories = categoryService.getAllPublished()
            
            // 记录每个分类应该有的产品数量
            const expectedCounts = new Map<string, number>()
            categories.forEach(c => expectedCounts.set(c.id, 0))
            
            // 添加产品
            let productId = 1
            for (const dist of distributions) {
              const category = categories[dist.categoryIndex]
              if (category) {
                for (let i = 0; i < dist.productCount; i++) {
                  addTestProduct(category.id, `P${productId++}`)
                  expectedCounts.set(category.id, (expectedCounts.get(category.id) || 0) + 1)
                }
              }
            }
            
            // 获取带数量的分类列表
            const categoriesWithCount = categoryService.getCategoriesWithCount()
            
            // 验证每个分类的产品数量
            for (const cat of categoriesWithCount) {
              const expected = expectedCounts.get(cat.id) || 0
              expect(cat.productCount).toBe(expected)
            }
            
            return true
          }
        ),
        { numRuns: 20 }
      )
    }, 15000)
  })
})
