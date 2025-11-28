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
   */
  static async processProducts(file: File): Promise<ProcessResult<any>> {
    try {
      const XLSX = await import('xlsx')
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer)
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])

      const validation = this.validateProductData(data)
      const formattedData = this.formatProductsData(data)

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

  /**
   * 验证产品数据
   */
  static validateProductData(data: any[]): ValidationResult {
    const requiredFields = ['name', 'categoryId', 'specs', 'desc']
    const errors: string[] = []
    const warnings: string[] = []

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })

      // 检查ID格式
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
    const requiredFields = ['brand_id', 'show_name', 'logo_url']
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
   * 验证促销数据
   */
  static validatePromotionData(data: any[]): ValidationResult {
    const requiredFields = ['id', 'title', 'summary']
    const errors: string[] = []
    const warnings: string[] = []

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          errors.push(`第${index + 2}行: 缺少必填字段 "${field}"`)
        }
      })

      // 检查日期格式
      if (row.start_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.start_date)) {
        warnings.push(`第${index + 2}行: 开始日期格式应为 YYYY-MM-DD`)
      }
      if (row.end_date && !/^\d{4}-\d{2}-\d{2}$/.test(row.end_date)) {
        warnings.push(`第${index + 2}行: 结束日期格式应为 YYYY-MM-DD`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * 格式化产品数据
   */
  static formatProductsData(data: any[]): any[] {
    return data.map((row, index) => ({
      id: row.id || `P${1000 + index}`,
      name: row.name || '',
      categoryId: row.categoryId || '',
      brand: row.brand || undefined,
      sku: row.sku || undefined,
      specs: row.specs || '',
      unit: row.unit || undefined,
      desc: row.desc || '',
      originalPrice: row.originalPrice ? Number(row.originalPrice) : undefined,
      currentPrice: row.currentPrice ? Number(row.currentPrice) : undefined,
      stock: row.stock ? Number(row.stock) : undefined,
      isOnSale: row.isOnSale === true || row.isOnSale === 'true' || row.isOnSale === 1
    }))
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

