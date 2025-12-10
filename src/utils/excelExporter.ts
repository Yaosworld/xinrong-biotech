/**
 * Excel 导出工具
 * 支持导出当前数据、模板（带示例）、空白模板
 */

export interface ExportColumn {
  key: string
  label: string
  type?: string
  required?: boolean
  options?: { label: string; value: string | number | boolean }[]
  description?: string  // 字段说明
  example?: string      // 示例值
}

export type ExportMode = 'data' | 'template' | 'blank'

export interface ExportOptions {
  mode: ExportMode
  filename: string
  columns: ExportColumn[]
  data?: any[]
  sheetName?: string
}

/**
 * Excel 导出器类
 */
export class ExcelExporter {
  /**
   * 导出 Excel 文件
   */
  static async export(options: ExportOptions): Promise<void> {
    const XLSX = await import('xlsx')
    const workbook = XLSX.utils.book_new()

    switch (options.mode) {
      case 'data':
        this.createDataSheet(workbook, XLSX, options)
        break
      case 'template':
        this.createTemplateSheets(workbook, XLSX, options)
        break
      case 'blank':
        this.createBlankSheet(workbook, XLSX, options)
        break
    }

    // 下载文件
    XLSX.writeFile(workbook, `${options.filename}.xlsx`)
  }

  /**
   * 创建数据表（导出当前数据）
   * 使用字段名(key)作为表头，确保导入时能正确识别
   */
  private static createDataSheet(workbook: any, XLSX: any, options: ExportOptions): void {
    const { columns, data = [], sheetName = '数据' } = options

    // 使用字段名作为表头（与导入格式一致）
    const headers = columns.map(col => col.key)
    const rows = data.map(item => 
      columns.map(col => this.formatCellValue(item[col.key], col))
    )

    // 创建工作表
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
    
    // 设置列宽
    worksheet['!cols'] = columns.map(col => ({
      wch: Math.max(col.key.length * 2, col.label.length * 2, 12)
    }))

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * 创建模板表（字段说明 + 示例数据）
   */
  private static createTemplateSheets(workbook: any, XLSX: any, options: ExportOptions): void {
    const { columns } = options

    // Sheet 1: 字段说明
    const fieldHeaders = ['字段名(Excel表头)', '显示名称', '类型', '是否必填', '可选值', '说明', '示例值']
    const fieldRows = columns.map(col => [
      col.key,
      col.label,
      this.getTypeLabel(col.type),
      col.required ? '是' : '否',
      col.options ? col.options.map(o => `${o.value}(${o.label})`).join(', ') : '-',
      col.description || this.getDefaultDescription(col),
      col.example || this.getDefaultExample(col)
    ])

    const fieldSheet = XLSX.utils.aoa_to_sheet([fieldHeaders, ...fieldRows])
    fieldSheet['!cols'] = [
      { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 20 }
    ]
    XLSX.utils.book_append_sheet(workbook, fieldSheet, '字段说明')

    // Sheet 2: 示例数据（使用字段名作为表头，与导入格式一致）
    const dataHeaders = columns.map(col => col.key)
    const exampleRows = this.generateExampleRows(columns, 3)
    
    const exampleSheet = XLSX.utils.aoa_to_sheet([dataHeaders, ...exampleRows])
    exampleSheet['!cols'] = columns.map(col => ({
      wch: Math.max(col.key.length * 2, col.label.length * 2, 15)
    }))
    XLSX.utils.book_append_sheet(workbook, exampleSheet, '示例数据')
  }

  /**
   * 创建空白模板（只有表头）
   * 使用字段名(key)作为表头，确保导入时能正确识别
   */
  private static createBlankSheet(workbook: any, XLSX: any, options: ExportOptions): void {
    const { columns, sheetName = '导入模板' } = options

    // 使用字段名作为表头（与导入格式一致）
    const headers = columns.map(col => col.key)
    const worksheet = XLSX.utils.aoa_to_sheet([headers])
    
    // 设置列宽
    worksheet['!cols'] = columns.map(col => ({
      wch: Math.max(col.key.length * 2, col.label.length * 2, 15)
    }))

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  }

  /**
   * 格式化单元格值
   * 注意：导出时保持原始值，确保导出的数据能正确导入
   */
  private static formatCellValue(value: any, col: ExportColumn): any {
    if (value == null) return ''
    
    // 数组转字符串
    if (Array.isArray(value)) {
      return value.join(', ')
    }
    
    // 布尔值 - 使用 true/false 确保导入兼容
    if (col.type === 'boolean') {
      return value ? 'true' : 'false'
    }
    
    // select 类型保持原始 value，不转换为 label
    // 这样导出的数据可以直接导入
    return value
  }

  /**
   * 获取类型标签
   */
  private static getTypeLabel(type?: string): string {
    const typeMap: Record<string, string> = {
      text: '文本',
      number: '数字',
      select: '选择',
      date: '日期',
      boolean: '是/否',
      image: '图片URL',
      textarea: '多行文本',
      tags: '标签(逗号分隔)'
    }
    return typeMap[type || 'text'] || '文本'
  }

  /**
   * 获取默认字段说明
   */
  private static getDefaultDescription(col: ExportColumn): string {
    if (col.type === 'date') return '格式: YYYY-MM-DD'
    if (col.type === 'boolean') return '填写: 是/否 或 true/false'
    if (col.type === 'tags') return '多个标签用逗号分隔'
    if (col.type === 'image') return '图片路径或URL'
    if (col.type === 'select') return '从可选值中选择'
    if (col.required) return '必填字段'
    return '可选字段'
  }

  /**
   * 获取默认示例值
   */
  private static getDefaultExample(col: ExportColumn): string {
    if (col.example) return col.example
    if (col.type === 'date') return '2024-01-15'
    if (col.type === 'boolean') return '是'
    if (col.type === 'number') return '100'
    if (col.type === 'tags') return '标签1, 标签2'
    if (col.type === 'image') return '/images/example.jpg'
    if (col.type === 'select' && col.options?.length) {
      return String(col.options[0].value)
    }
    return `示例${col.label}`
  }

  /**
   * 生成示例数据行
   * 对于 select 类型，使用 value 而不是 label（与导入格式一致）
   */
  private static generateExampleRows(columns: ExportColumn[], count: number): any[][] {
    const rows: any[][] = []
    
    for (let i = 1; i <= count; i++) {
      const row = columns.map(col => {
        if (col.key === 'id') return `P${1000 + i}`
        if (col.type === 'date') return `2024-0${i}-15`
        if (col.type === 'boolean') return i % 2 === 0 ? 'true' : 'false'
        if (col.type === 'number') return i * 100
        if (col.type === 'tags') return `标签${i}A, 标签${i}B`
        if (col.type === 'image') return `/images/sample${i}.jpg`
        if (col.type === 'select' && col.options?.length) {
          // 使用 value 而不是 label，确保导入时能正确识别
          return col.options[i % col.options.length]?.value || ''
        }
        return `${col.label}示例${i}`
      })
      rows.push(row)
    }
    
    return rows
  }
}
