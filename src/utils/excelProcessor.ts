/**
 * Excel 处理工具
 * 用于前端解析Excel文件并转换为JSON
 */

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
}

/**
 * Excel 处理器类
 */
export class ExcelProcessor {
  /**
   * 处理产品数据Excel
   * @param file Excel 文件
   * @param existingIds 已存在的 ID 列表（用于避免 ID 冲突）
   */
  static async processProducts(file: File, existingIds?: string[]): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validateProductData(data)
      const formattedData = this.formatProductsData(data, existingIds)

      return {
        success: validation.isValid,
        data: formattedData,
        validation,
        message: validation.isValid ? '产品数据处理成功' : '产品数据存在错误'
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

  // 分类映射表：ID -> 名称，名称 -> ID（支持双向查找）
  static readonly CATEGORY_MAP: Record<string, string> = {
    // ID -> 名称
    'C01': '仪器设备',
    'C02': '实验耗材',
    'C03': '实验试剂',
    'C04': '细胞相关产品',
    'C05': '分子生物实验产品',
    // 名称 -> ID（反向映射）
    '仪器设备': 'C01',
    '实验耗材': 'C02',
    '实验试剂': 'C03',
    '细胞相关产品': 'C04',
    '分子生物实验产品': 'C05'
  }

  // 有效的产品分类 ID 列表
  static readonly VALID_CATEGORY_IDS = ['C01', 'C02', 'C03', 'C04', 'C05']

  /**
   * 将分类名称或ID转换为标准ID
   */
  static normalizeCategoryId(value: string): string | null {
    if (!value) return null
    const trimmed = value.trim()
    // 如果已经是有效ID，直接返回
    if (this.VALID_CATEGORY_IDS.includes(trimmed)) {
      return trimmed
    }
    // 尝试通过名称查找ID
    const id = this.CATEGORY_MAP[trimmed]
    return id && this.VALID_CATEGORY_IDS.includes(id) ? id : null
  }

  /**
   * 验证产品数据
   */
  static validateProductData(data: any[]): ValidationResult {
    const requiredFields = ['name', 'categoryId', 'specs', 'desc']
    const errors: string[] = []
    const warnings: string[] = []
    const validNames = Object.keys(this.CATEGORY_MAP).filter(k => !this.VALID_CATEGORY_IDS.includes(k))

    data.forEach((row, index) => {
      // 检查必填字段
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })

      // 检查 categoryId 有效性（支持ID或名称）
      if (row.categoryId) {
        const normalizedId = this.normalizeCategoryId(row.categoryId)
        if (!normalizedId) {
          errors.push(`第${index + 2}行: 分类 "${row.categoryId}" 无效，有效值: ${this.VALID_CATEGORY_IDS.join(', ')} 或 ${validNames.join(', ')}`)
        }
      }

      // 检查ID格式（警告）
      if (row.id && !/^P\d+$/.test(row.id)) {
        warnings.push(`第${index + 2}行: 产品ID格式建议为 "P" + 数字`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
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

  /**
   * 格式化产品数据
   * @param data 原始数据
   * @param existingIds 已存在的 ID 列表（用于避免冲突）
   */
  static formatProductsData(data: any[], existingIds?: string[]): any[] {
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
      
      return {
        id,
        name: row.name || '',
        // 将分类名称转换为ID（支持名称或ID输入）
        categoryId: this.normalizeCategoryId(row.categoryId) || row.categoryId || '',
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

