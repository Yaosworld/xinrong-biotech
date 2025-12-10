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
   */
  private static getItemHash(item: any, rowKey: string, compareFields?: string[]): string {
    // 排除主键，只比较内容字段
    const fieldsToCompare = compareFields || Object.keys(item).filter(k => k !== rowKey)
    
    const values = fieldsToCompare.map(field => {
      const value = item[field]
      if (value == null) return ''
      if (Array.isArray(value)) return value.sort().join(',')
      return String(value)
    })
    
    return values.join('|')
  }

  /**
   * 生成重复报告的 HTML
   */
  static generateReport(result: DuplicateCheckResult, columns: { key: string; label: string }[]): string {
    const { stats, internalDuplicates, existingDuplicates } = result
    
    let html = `<div style="max-height: 400px; overflow-y: auto;">`
    
    // 统计摘要
    html += `<div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 4px;">
      <strong>检测结果：</strong><br>
      总计 ${stats.total} 条数据，其中：<br>
      • 唯一数据：${stats.unique} 条<br>
      • 文件内重复：${stats.internalDupCount} 条<br>
      • 与现有数据重复：${stats.existingDupCount} 条
    </div>`

    // 文件内重复详情
    if (internalDuplicates.length > 0) {
      html += `<div style="margin-bottom: 12px;">
        <strong style="color: #e6a23c;">⚠️ 文件内重复（${internalDuplicates.length} 条）：</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">`
      
      internalDuplicates.slice(0, 5).forEach(dup => {
        const preview = this.getItemPreview(dup.item, columns)
        html += `<li>第 ${dup.importIndex + 2} 行：${preview}</li>`
      })
      
      if (internalDuplicates.length > 5) {
        html += `<li>...还有 ${internalDuplicates.length - 5} 条</li>`
      }
      html += `</ul></div>`
    }

    // 与现有数据重复详情
    if (existingDuplicates.length > 0) {
      html += `<div>
        <strong style="color: #f56c6c;">❌ 与现有数据重复（${existingDuplicates.length} 条）：</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">`
      
      existingDuplicates.slice(0, 5).forEach(dup => {
        const preview = this.getItemPreview(dup.item, columns)
        html += `<li>第 ${dup.importIndex + 2} 行：${preview}</li>`
      })
      
      if (existingDuplicates.length > 5) {
        html += `<li>...还有 ${existingDuplicates.length - 5} 条</li>`
      }
      html += `</ul></div>`
    }

    html += `</div>`
    return html
  }

  /**
   * 获取数据项预览文本
   */
  private static getItemPreview(item: any, columns: { key: string; label: string }[]): string {
    const previewFields = columns.slice(0, 3)
    return previewFields
      .map(col => {
        const value = item[col.key]
        if (value == null) return ''
        const str = String(value)
        return str.length > 20 ? str.substring(0, 20) + '...' : str
      })
      .filter(Boolean)
      .join(' / ')
  }
}
