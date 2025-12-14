/**
 * Excel 处理工具
 * 用于前端解析Excel文件并转换为JSON
 */

import { useCategoryStore } from '@/stores/categoryStore'
import { 
  DEFAULT_CATEGORY_IDS, 
  CATEGORY_ID_TO_NAME, 
  CATEGORY_NAME_TO_ID,
  UNCATEGORIZED_ID 
} from '@/constants/categories'
import { PendingCategoryError, ValidationError } from '@/types/errors'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  undefinedCategories?: string[]
}

export interface ProcessResult<T> {
  success: boolean
  data: T[]
  validation: ValidationResult
  message: string
  /** 检测到的未定义分类列表 */
  undefinedCategories?: string[]
}

// 重新导出错误类型
export { PendingCategoryError, ValidationError }

/**
 * Excel 处理器类
 */
export class ExcelProcessor {
  /**
   * 处理产品数据Excel
   * @param file Excel 文件
   * @param existingIds 已存在的 ID 列表（用于避免 ID 冲突）
   * @param options 选项
   */
  static async processProducts(
    file: File, 
    existingIds?: string[],
    options?: { skipCategoryValidation?: boolean; newCategoryMap?: Map<string, string> }
  ): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validateProductData(data, options?.skipCategoryValidation)
      const formattedData = this.formatProductsData(data, existingIds, options?.newCategoryMap)

      return {
        success: validation.isValid,
        data: formattedData,
        validation,
        message: validation.isValid ? '产品数据处理成功' : '产品数据存在错误',
        undefinedCategories: validation.undefinedCategories
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        validation: { isValid: false, errors: [(error as Error).message], warnings: [], undefinedCategories: [] },
        message: '文件处理失败',
        undefinedCategories: []
      }
    }
  }

  /**
   * 仅解析Excel文件，不进行格式化（用于预检测）
   */
  static async parseExcelFile(file: File): Promise<{ success: boolean; data: any[]; error?: string }> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
      return { success: true, data }
    } catch (error) {
      return { success: false, data: [], error: (error as Error).message }
    }
  }

  /**
   * 处理分类数据Excel
   */
  static async processCategories(file: File): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validateCategoryData(data)

      return {
        success: validation.isValid,
        data,
        validation,
        message: validation.isValid ? '分类数据处理成功' : '分类数据存在错误'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        validation: { isValid: false, errors: [(error as Error).message], warnings: [] },
        message: '文件处理失败'
      }
    }
  }

  /**
   * 处理品牌数据Excel
   */
  static async processBrands(file: File): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validateBrandData(data)

      return {
        success: validation.isValid,
        data,
        validation,
        message: validation.isValid ? '品牌数据处理成功' : '品牌数据存在错误'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        validation: { isValid: false, errors: [(error as Error).message], warnings: [] },
        message: '文件处理失败'
      }
    }
  }

  /**
   * 处理促销数据Excel
   */
  static async processPromotions(file: File): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validatePromotionData(data)

      return {
        success: validation.isValid,
        data,
        validation,
        message: validation.isValid ? '促销数据处理成功' : '促销数据存在错误'
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        validation: { isValid: false, errors: [(error as Error).message], warnings: [] },
        message: '文件处理失败'
      }
    }
  }

  // 使用统一的常量定义
  static readonly DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORY_IDS

  /**
   * 动态获取分类映射表（从 categoryStore）
   */
  static getCategoryMap(): { idToName: Map<string, string>; nameToId: Map<string, string>; validIds: Set<string> } {
    try {
      const store = useCategoryStore()
      if (store.initialized && store.categories.length > 0) {
        const idToName = new Map(store.categories.map(c => [c.id, c.name]))
        const nameToId = new Map(store.categories.map(c => [c.name, c.id]))
        const validIds = new Set(store.categories.map(c => c.id))
        return { idToName, nameToId, validIds }
      }
    } catch {
      // store 未初始化
    }
    // 降级到统一的默认值
    return { 
      idToName: new Map(CATEGORY_ID_TO_NAME), 
      nameToId: new Map(CATEGORY_NAME_TO_ID), 
      validIds: new Set(DEFAULT_CATEGORY_IDS) 
    }
  }

  /**
   * 将分类名称或ID转换为标准ID
   */
  static normalizeCategoryId(value: string): string | null {
    if (!value) return null
    const trimmed = value.trim()
    const { validIds, nameToId } = this.getCategoryMap()
    // 如果已经是有效ID，直接返回
    if (validIds.has(trimmed)) {
      return trimmed
    }
    // 尝试通过名称查找ID
    const id = nameToId.get(trimmed)
    return id || null
  }

  /**
   * 从数据中提取所有分类值
   */
  static extractCategoryValues(data: any[]): string[] {
    const values = new Set<string>()
    data.forEach(row => {
      if (row.categoryId) {
        values.add(String(row.categoryId).trim())
      }
    })
    return Array.from(values)
  }

  /**
   * 检测未定义的分类
   */
  static detectUndefinedCategories(categoryValues: string[]): string[] {
    const { validIds, nameToId } = this.getCategoryMap()
    const undefined_: string[] = []
    const seen = new Set<string>()
    
    for (const value of categoryValues) {
      if (!value || seen.has(value)) continue
      seen.add(value)
      const trimmed = value.trim()
      // 检查是否是有效的ID或名称
      if (!validIds.has(trimmed) && !nameToId.has(trimmed)) {
        undefined_.push(trimmed)
      }
    }
    return undefined_
  }

  /**
   * 验证产品数据
   * @param data 原始数据
   * @param skipCategoryValidation 是否跳过分类验证（用于检测新分类场景）
   */
  static validateProductData(data: any[], skipCategoryValidation = false): ValidationResult & { undefinedCategories: string[] } {
    const requiredFields = ['name', 'categoryId', 'specs', 'desc']
    const errors: string[] = []
    const warnings: string[] = []
    const undefinedCategories: string[] = []

    data.forEach((row, index) => {
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })

      // 检查 categoryId 有效性（支持ID或名称）
      if (row.categoryId && !skipCategoryValidation) {
        const normalizedId = this.normalizeCategoryId(row.categoryId)
        if (!normalizedId) {
          // 收集未定义分类而不是直接报错
          const trimmed = String(row.categoryId).trim()
          if (!undefinedCategories.includes(trimmed)) {
            undefinedCategories.push(trimmed)
          }
        }
      }

      // ID 列会被忽略，不需要逐行警告（在下面统一提示）
    })

    // 如果有未定义分类，添加警告而不是错误（让调用方决定如何处理）
    if (undefinedCategories.length > 0 && !skipCategoryValidation) {
      warnings.push(`检测到 ${undefinedCategories.length} 个未定义分类: ${undefinedCategories.join(', ')}`)
    }

    // 检查是否有 ID 列，提示用户 ID 会被忽略
    const hasIdColumn = data.some(row => row.id !== undefined && row.id !== '')
    if (hasIdColumn) {
      warnings.push('Excel 中的 ID 列将被忽略，系统会自动生成新的产品ID（格式：P000001）')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      undefinedCategories
    }
  }

  /**
   * 验证分类数据
   */
  static validateCategoryData(data: any[]): ValidationResult {
    const requiredFields = ['id', 'name', 'imageName']
    const errors: string[] = []
    const warnings: string[] = []

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 验证品牌数据
   */
  static validateBrandData(data: any[]): ValidationResult {
    const requiredFields = ['name']  // 品牌名称必填
    const errors: string[] = []
    const warnings: string[] = []

    data.forEach((row, index) => {
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })
      
      // ID 格式警告
      if (row.id && !/^B\d{3}$/.test(row.id)) {
        warnings.push(`第${index + 2}行: 品牌ID格式建议为 "B" + 3位数字`)
      }
      
      // 国家有效性检查（警告）
      const validCountries = ['中国', '美国', '日本', '德国', '英国', '法国', '瑞士', '韩国']
      if (row.country && !validCountries.includes(row.country)) {
        warnings.push(`第${index + 2}行: 国家 "${row.country}" 不在预设列表中`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 验证促销/活动数据
   */
  static validatePromotionData(data: any[]): ValidationResult {
    const requiredFields = ['title', 'summary', 'start_date', 'end_date']
    const errors: string[] = []
    const warnings: string[] = []

    data.forEach((row, index) => {
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })

      // 日期格式验证（错误级别）
      if (row.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) {
        errors.push(`第${index + 2}行: 开始日期格式应为 YYYY-MM-DD`)
      }
      if (row.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)) {
        errors.push(`第${index + 2}行: 结束日期格式应为 YYYY-MM-DD`)
      }
      
      // 日期逻辑验证
      if (row.start_date && row.end_date && row.start_date > row.end_date) {
        errors.push(`第${index + 2}行: 结束日期不能早于开始日期`)
      }
      
      // ID 格式警告
      if (row.id && !/^A\d{3}$/.test(row.id)) {
        warnings.push(`第${index + 2}行: 活动ID格式建议为 "A" + 3位数字`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 解析布尔值（支持多种输入格式）
   */
  static parseBoolean(value: any): boolean {
    if (value === true || value === 1) return true
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim()
      return v === 'true' || v === '是' || v === 'yes' || v === '1'
    }
    return false
  }

  /** 未分类的特殊ID（使用统一常量） */
  static readonly UNCATEGORIZED_ID = UNCATEGORIZED_ID

  /** 产品 ID 位数（支持100万条产品） */
  static readonly PRODUCT_ID_DIGITS = 6

  /**
   * 生成产品 ID
   * @param num 数字序号
   * @returns 格式化的产品 ID，如 P000001
   */
  static generateProductId(num: number): string {
    return `P${String(num).padStart(this.PRODUCT_ID_DIGITS, '0')}`
  }

  /**
   * 从产品 ID 中提取数字
   * @param id 产品 ID，如 P000001 或 P1
   * @returns 数字序号
   */
  static extractProductIdNum(id: string | undefined | null): number {
    if (!id) return 0
    const num = parseInt(id.replace(/^P/, ''), 10)
    return isNaN(num) ? 0 : num
  }

  /**
   * 格式化产品数据
   * 
   * 设计原则：
   * 1. 导入时忽略 Excel 中的 ID，统一生成新 ID（确保 ID 唯一性和格式一致性）
   * 2. ID 格式为 P + 6位数字（如 P000001），支持100万条产品
   * 3. ID 自增，永不重用（即使删除产品，ID 也不会被重新分配）
   * 
   * @param data 原始数据
   * @param existingIds 已存在的 ID 列表（用于计算下一个可用 ID）
   * @param newCategoryMap 新分类映射（名称 -> ID），用于处理新定义的分类
   */
  static formatProductsData(data: any[], existingIds?: string[], newCategoryMap?: Map<string, string>): any[] {
    // 找到当前最大的数字 ID
    let maxIdNum = 0
    existingIds?.forEach(id => {
      const num = this.extractProductIdNum(id)
      if (num > maxIdNum) maxIdNum = num
    })
    
    return data.map((row) => {
      // 始终生成新 ID，忽略 Excel 中的 ID（确保格式一致性和唯一性）
      maxIdNum++
      const id = this.generateProductId(maxIdNum)

      // 处理分类ID
      let categoryId: string | null = null
      const rawCategoryValue = row.categoryId ? String(row.categoryId).trim() : ''
      
      if (rawCategoryValue) {
        // 优先从新分类映射中查找（处理刚创建的分类）
        if (newCategoryMap?.has(rawCategoryValue)) {
          categoryId = newCategoryMap.get(rawCategoryValue)!
        } else {
          // 尝试从已有分类中查找
          categoryId = this.normalizeCategoryId(rawCategoryValue)
        }
      }
      
      // 如果仍然没有找到，设为未分类
      if (!categoryId) {
        categoryId = this.UNCATEGORIZED_ID
      }
      
      return {
        id,
        name: row.name || '',
        categoryId,
        brand: row.brand || undefined,
        sku: row.sku || undefined,
        specs: row.specs || '',
        unit: row.unit || undefined,
        desc: row.desc || '',
        originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined,
        currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
        stock: row.stock ? Number(row.stock) : undefined,
        isOnSale: this.parseBoolean(row.isOnSale)
      }
    })
  }

  /**
   * 生成JSON文件对象
   */
  static generateJsonFile(data: any[], type: string, version = '1.0') {
    return {
      meta: {
        type,
        version,
        generated: new Date().toISOString(),
        totalRecords: data.length
      },
      data
    }
  }
}

