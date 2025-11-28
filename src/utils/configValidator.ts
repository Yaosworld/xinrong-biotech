/**
 * 配置验证工具
 * 用于验证各种配置数据的格式和内容
 */

export interface ValidationError {
  path: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

type FieldSchema = {
  type?: string
  required?: boolean
  pattern?: RegExp
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  properties?: Record<string, FieldSchema>
  items?: FieldSchema
}

/**
 * 配置验证器类
 */
export class ConfigValidator {
  /**
   * 验证网站信息配置
   */
  static validateSiteInfo(config: any): ValidationResult {
    const schema: Record<string, FieldSchema> = {
      name: { type: 'string', required: true, minLength: 1 },
      logo: { type: 'string', required: true },
      contact: {
        type: 'object',
        required: true,
        properties: {
          phone: { type: 'string', pattern: /^[\d\-\+\(\)\s]+$/ },
          email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
          address: { type: 'string' }
        }
      },
      footer: {
        type: 'object',
        properties: {
          copyright: { type: 'string' },
          links: { type: 'array' }
        }
      }
    }

    return this.validate(config, schema)
  }

  /**
   * 验证页面配置
   */
  static validatePageConfig(config: any): ValidationResult {
    const schema: Record<string, FieldSchema> = {
      id: { type: 'string', required: true },
      title: { type: 'string', required: true }
    }

    return this.validate(config, schema)
  }

  /**
   * 验证产品数据
   */
  static validateProduct(product: any): ValidationResult {
    const schema: Record<string, FieldSchema> = {
      id: { type: 'string', required: true },
      name: { type: 'string', required: true, minLength: 1 },
      categoryId: { type: 'string', required: true },
      specs: { type: 'string', required: true },
      desc: { type: 'string', required: true }
    }

    return this.validate(product, schema)
  }

  /**
   * 验证品牌数据
   */
  static validateBrand(brand: any): ValidationResult {
    const schema: Record<string, FieldSchema> = {
      brand_id: { type: 'string', required: true },
      show_name: { type: 'string', required: true },
      logo_url: { type: 'string', required: true }
    }

    return this.validate(brand, schema)
  }

  /**
   * 验证促销数据
   */
  static validatePromotion(promotion: any): ValidationResult {
    const schema: Record<string, FieldSchema> = {
      id: { type: 'number', required: true },
      title: { type: 'string', required: true },
      summary: { type: 'string', required: true }
    }

    return this.validate(promotion, schema)
  }

  /**
   * 通用验证方法
   */
  static validate(data: any, schema: Record<string, FieldSchema>): ValidationResult {
    const errors: ValidationError[] = []

    const validateField = (value: any, fieldSchema: FieldSchema, path: string) => {
      // 必填检查
      if (fieldSchema.required && (value === undefined || value === null || value === '')) {
        errors.push({ path, message: '此字段为必填项' })
        return
      }

      if (value === undefined || value === null) {
        return
      }

      // 类型检查
      if (fieldSchema.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value
        if (actualType !== fieldSchema.type) {
          errors.push({ path, message: `期望类型 ${fieldSchema.type}，实际类型 ${actualType}` })
          return
        }
      }

      // 字符串验证
      if (typeof value === 'string') {
        if (fieldSchema.minLength && value.length < fieldSchema.minLength) {
          errors.push({ path, message: `长度不能少于 ${fieldSchema.minLength} 个字符` })
        }
        if (fieldSchema.maxLength && value.length > fieldSchema.maxLength) {
          errors.push({ path, message: `长度不能超过 ${fieldSchema.maxLength} 个字符` })
        }
        if (fieldSchema.pattern && !fieldSchema.pattern.test(value)) {
          errors.push({ path, message: '格式不正确' })
        }
      }

      // 数字验证
      if (typeof value === 'number') {
        if (fieldSchema.min !== undefined && value < fieldSchema.min) {
          errors.push({ path, message: `不能小于 ${fieldSchema.min}` })
        }
        if (fieldSchema.max !== undefined && value > fieldSchema.max) {
          errors.push({ path, message: `不能大于 ${fieldSchema.max}` })
        }
      }

      // 对象嵌套验证
      if (typeof value === 'object' && !Array.isArray(value) && fieldSchema.properties) {
        Object.keys(fieldSchema.properties).forEach(key => {
          validateField(value[key], fieldSchema.properties![key], `${path}.${key}`)
        })
      }

      // 数组验证
      if (Array.isArray(value) && fieldSchema.items) {
        value.forEach((item, index) => {
          validateField(item, fieldSchema.items!, `${path}[${index}]`)
        })
      }
    }

    Object.keys(schema).forEach(key => {
      validateField(data[key], schema[key], key)
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 验证JSON字符串格式
   */
  static validateJsonString(jsonString: string): ValidationResult {
    try {
      JSON.parse(jsonString)
      return { isValid: true, errors: [] }
    } catch (error) {
      return {
        isValid: false,
        errors: [{ path: '', message: `JSON格式错误: ${(error as Error).message}` }]
      }
    }
  }
}

