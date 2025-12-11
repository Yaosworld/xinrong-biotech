/**
 * Excel 处理工具
 * 用于前端解析Excel文件并转换为JSON
 */

import { useCategoryStore } from '@/stores/categoryStore'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ProcessResult<T> {
  success: boolean
  data: T[]
  validation: ValidationResult
  message: string
  /** 检测到的未定义分类列表 */
  undefinedCategories?: string[]
}

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

  // 默认分类映射表（用于降级）
  static readonly DEFAULT_CATEGORY_MAP: Record<string, string> = {
    'C01': '仪器设备', 'C02': '实验耗材', 'C03': '实验试剂',
    'C04': '细胞相关产品', 'C05': '分子生物实验产品',
    '仪器设备': 'C01', '实验耗材': 'C02', '实验试剂': 'C03',
    '细胞相关产品': 'C04', '分子生物实验产品': 'C05'
  }

  // 默认有效分类 ID 列表
  static readonly DEFAULT_CATEGORY_IDS = ['C01', 'C02', 'C03', 'C04', 'C05']

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
    // 降级到默认值
    const idToName = new Map<string, string>()
    const nameToId = new Map<string, string>()
    this.DEFAULT_CATEGORY_IDS.forEach(id => {
      const name = this.DEFAULT_CATEGORY_MAP[id]
      idToName.set(id, name)
      nameToId.set(name, id)
    })
    return { idToName, nameToId, validIds: new Set(this.DEFAULT_CATEGORY_IDS) }
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
    const { validIds, idToName } = this.getCategoryMap()
    const validNames = Array.from(idToName.values())
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

      // 检查ID格式（警告）
      if (row.id && !/^P\d+$/.test(row.id)) {
        warnings.push(`第${index + 2}行: 产品ID格式建议为 "P" + 数字`)
      }
    })

    // 如果有未定义分类，添加警告而不是错误（让调用方决定如何处理）
    if (undefinedCategories.length > 0 && !skipCategoryValidation) {
      warnings.push(`检测到 ${undefinedCategories.length} 个未定义分类: ${undefinedCategories.join(', ')}`)
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

  /** 未分类的特殊ID */
  static readonly UNCATEGORIZED_ID = 'C00'

  /**
   * 格式化产品数据
   * @param data 原始数据
   * @param existingIds 已存在的 ID 列表（用于避免冲突）
   * @param newCategoryMap 新分类映射（名称 -> ID），用于处理新定义的分类
   */
  static formatProductsData(data: any[], existingIds?: string[], newCategoryMap?: Map<string, string>): any[] {
    // 收集已使用的 ID（包括已存在的和本次导入中已分配的）
    const usedIds = new Set<string>(existingIds || [])
    
    // 找到最大的数字 ID
    let maxIdNum = 0
    usedIds.forEach(id => {
      const num = parseInt(id?.replace(/^P/, '') || '0', 10)
      if (!isNaN(num)) maxIdNum = Math.max(maxIdNum, num)
    })
    
    return data.map((row) => {
      let id = row.id
      
      // 如果没有 ID 或 ID 已存在，生成新 ID
      if (!id || usedIds.has(id)) {
        maxIdNum++
        id = `P${maxIdNum}`
      }
      usedIds.add(id)
      
      // 处理分类ID
      let categoryId = this.normalizeCategoryId(row.categoryId)
      if (!categoryId && row.categoryId) {
        // 尝试从新分类映射中查找
        const trimmed = String(row.categoryId).trim()
        categoryId = newCategoryMap?.get(trimmed) || null
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

