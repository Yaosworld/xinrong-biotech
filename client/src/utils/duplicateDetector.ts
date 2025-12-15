/**
 * 重复数据检测工具
 * 用于检测导入数据、新增数据与现有数据的重复情况
 */

export interface DuplicateInfo {
  /** 重复项在导入数据中的索引 */
  importIndex: number
  /** 重复项数据 */
  item: any
  /** 重复类型 */
  type: 'internal' | 'existing'
  /** 与之重复的项（existing 类型时有值） */
  existingItem?: any
}

export interface DuplicateCheckResult {
  /** 是否有重复 */
  hasDuplicates: boolean
  /** 文件内部重复 */
  internalDuplicates: DuplicateInfo[]
  /** 与现有数据重复 */
  existingDuplicates: DuplicateInfo[]
  /** 去重后的数据 */
  uniqueData: any[]
  /** 统计信息 */
  stats: {
    total: number
    unique: number
    internalDupCount: number
    existingDupCount: number
  }
}

export type DuplicateStrategy = 'skip' | 'overwrite' | 'keepBoth'

/**
 * 重复检测器类
 */
export class DuplicateDetector {
  /**
   * 检测重复数据
   * @param importData 导入的数据
   * @param existingData 现有数据
   * @param rowKey 主键字段名
   * @param compareFields 用于比较的字段（不含主键），为空则比较所有字段
   */
  static check(
    importData: any[],
    existingData: any[],
    rowKey: string = 'id',
    compareFields?: string[]
  ): DuplicateCheckResult {
    const internalDuplicates: DuplicateInfo[] = []
    const existingDuplicates: DuplicateInfo[] = []
    const uniqueData: any[] = []
    const seenHashes = new Set<string>()
    const existingHashes = new Map<string, any>()

    // 构建现有数据的哈希索引
    existingData.forEach(item => {
      const hash = this.getItemHash(item, rowKey, compareFields)
      existingHashes.set(hash, item)
    })

    // 检测导入数据
    importData.forEach((item, index) => {
      const hash = this.getItemHash(item, rowKey, compareFields)

      // 检查文件内部重复
      if (seenHashes.has(hash)) {
        internalDuplicates.push({
          importIndex: index,
          item,
          type: 'internal'
        })
        return
      }

      // 检查与现有数据重复
      if (existingHashes.has(hash)) {
        existingDuplicates.push({
          importIndex: index,
          item,
          type: 'existing',
          existingItem: existingHashes.get(hash)
        })
        return
      }

      seenHashes.add(hash)
      uniqueData.push(item)
    })

    return {
      hasDuplicates: internalDuplicates.length > 0 || existingDuplicates.length > 0,
      internalDuplicates,
      existingDuplicates,
      uniqueData,
      stats: {
        total: importData.length,
        unique: uniqueData.length,
        internalDupCount: internalDuplicates.length,
        existingDupCount: existingDuplicates.length
      }
    }
  }

  /**
   * 检测单条数据是否与现有数据重复
   */
  static checkSingle(
    item: any,
    existingData: any[],
    rowKey: string = 'id',
    compareFields?: string[],
    excludeIndex?: number
  ): { isDuplicate: boolean; duplicateItem?: any } {
    const itemHash = this.getItemHash(item, rowKey, compareFields)

    for (let i = 0; i < existingData.length; i++) {
      if (excludeIndex !== undefined && i === excludeIndex) continue
      
      const existingHash = this.getItemHash(existingData[i], rowKey, compareFields)
      if (itemHash === existingHash) {
        return { isDuplicate: true, duplicateItem: existingData[i] }
      }
    }

    return { isDuplicate: false }
  }

  /**
   * 根据策略处理重复数据
   */
  static applyStrategy(
    importData: any[],
    existingData: any[],
    checkResult: DuplicateCheckResult,
    strategy: DuplicateStrategy,
    rowKey: string = 'id'
  ): any[] {
    switch (strategy) {
      case 'skip':
        // 跳过所有重复，只返回唯一数据
        return checkResult.uniqueData

      case 'overwrite':
        // 用导入数据覆盖现有重复数据
        const result = [...existingData]
        const existingIdMap = new Map(existingData.map((item, idx) => [item[rowKey], idx]))
        
        // 先添加唯一数据
        result.push(...checkResult.uniqueData)
        
        // 处理与现有数据重复的项（覆盖）
        checkResult.existingDuplicates.forEach(dup => {
          const existingIdx = existingIdMap.get(dup.existingItem?.[rowKey])
          if (existingIdx !== undefined) {
            result[existingIdx] = dup.item
          }
        })
        
        return result

      case 'keepBoth':
        // 保留所有数据（包括重复）
        return [...existingData, ...importData]

      default:
        return checkResult.uniqueData
    }
  }

  /**
   * 生成数据项的哈希值（用于比较）
   * 优化：确保字段顺序无关，类型统一处理
   */
  private static getItemHash(item: any, rowKey: string, compareFields?: string[]): string {
    // 排除主键，只比较内容字段
    const fieldsToCompare = compareFields || Object.keys(item).filter(k => k !== rowKey)
    
    // 按字段名排序，确保顺序一致
    const sortedFields = [...fieldsToCompare].sort()
    
    const values = sortedFields.map(field => {
      const value = item[field]
      // 统一处理空值
      if (value == null || value === '' || value === undefined) return ''
      // 数组排序后拼接
      if (Array.isArray(value)) return value.map(v => this.normalizeValue(v)).sort().join(',')
      // 统一转换为字符串
      return this.normalizeValue(value)
    })
    
    return values.join('|')
  }

  /**
   * 标准化值（统一类型处理）
   */
  private static normalizeValue(value: any): string {
    if (value == null || value === '' || value === undefined) return ''
    // 布尔值统一为 'true'/'false'
    if (typeof value === 'boolean') return value ? 'true' : 'false'
    // 数字统一为字符串（去除小数点后多余的0）
    if (typeof value === 'number') return String(value)
    // 字符串去除首尾空格并转小写（可选，根据业务需求）
    if (typeof value === 'string') return value.trim()
    // 其他类型转字符串
    return String(value)
  }

  /**
   * 生成重复报告的 HTML
   */
  static generateReport(result: DuplicateCheckResult, columns: { key: string; label: string }[]): string {
    const { stats, internalDuplicates, existingDuplicates } = result
    const totalDup = stats.internalDupCount + stats.existingDupCount
    
    // 极简风格
    let html = `
      <div style="text-align: center; padding: 20px 0 24px;">
        <div style="font-size: 48px; font-weight: 300; color: #409eff; line-height: 1;">${stats.unique}<span style="font-size: 16px; color: #999; font-weight: 400;">/${stats.total}</span></div>
        <div style="font-size: 13px; color: #666; margin-top: 8px;">可导入数据</div>
      </div>
      
      <div style="display: flex; border-top: 1px solid #eee; border-bottom: 1px solid #eee;">
        <div style="flex: 1; text-align: center; padding: 12px 0; ${stats.internalDupCount > 0 ? 'color: #e6a23c;' : 'color: #c0c4cc;'}">
          <div style="font-size: 20px; font-weight: 500;">${stats.internalDupCount}</div>
          <div style="font-size: 12px; margin-top: 2px;">文件内重复</div>
        </div>
        <div style="width: 1px; background: #eee;"></div>
        <div style="flex: 1; text-align: center; padding: 12px 0; ${stats.existingDupCount > 0 ? 'color: #f56c6c;' : 'color: #c0c4cc;'}">
          <div style="font-size: 20px; font-weight: 500;">${stats.existingDupCount}</div>
          <div style="font-size: 12px; margin-top: 2px;">与现有重复</div>
        </div>
      </div>`

    // 重复详情（如果有）
    if (totalDup > 0) {
      const allDups = [
        ...internalDuplicates.map(d => ({ ...d, type: 'internal' })),
        ...existingDuplicates.map(d => ({ ...d, type: 'existing' }))
      ].slice(0, 4)
      
      html += `<div style="padding: 16px 0 8px; font-size: 13px; color: #909399;">`
      allDups.forEach(dup => {
        const preview = this.getItemPreview(dup.item, columns)
        const color = dup.type === 'internal' ? '#e6a23c' : '#f56c6c'
        html += `<div style="padding: 6px 0; display: flex; align-items: center;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color}; margin-right: 10px; flex-shrink: 0;"></span>
          <span style="color: #606266;">第${dup.importIndex + 2}行</span>
          <span style="color: #c0c4cc; margin: 0 8px;">|</span>
          <span style="color: #909399; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${preview}</span>
        </div>`
      })
      if (totalDup > 4) {
        html += `<div style="text-align: center; color: #c0c4cc; padding-top: 4px;">还有 ${totalDup - 4} 条重复数据</div>`
      }
      html += `</div>`
    }

    return html
  }

  /**
   * 获取数据项预览文本
   */
  private static getItemPreview(item: any, columns: { key: string; label: string }[]): string {
    const value = item[columns[1]?.key] || item[columns[0]?.key]
    if (value == null) return '-'
    const str = String(value)
    return str.length > 16 ? str.substring(0, 16) + '...' : str
  }
}
