/**
 * 促销活动相关常量配置
 */

// 活动状态配置
export const PROMOTION_STATUS_CONFIG = {
  // "即将结束"状态的天数阈值（距离结束 N 天以内）
  ENDING_SOON_DAYS: 5,
  
  // 状态优先级（数字越小优先级越高）
  PRIORITY: {
    endingSoon: 0,  // 即将结束 - 最高优先级
    active: 1,      // 正在进行
    coming: 2,      // 即将开始
    ended: 3        // 已结束 - 最低优先级
  } as const,
  
  // 状态文本
  TEXT: {
    endingSoon: '即将结束',
    active: '正在进行',
    coming: '即将开始',
    ended: '已经结束',
    unknown: '状态未知'
  } as const,
  
  // 状态颜色类名
  COLOR_CLASS: {
    endingSoon: 'time-status-ending-soon',  // 红橙色 - 紧迫
    active: 'time-status-active',           // 绿色 - 活跃
    coming: 'time-status-coming',           // 蓝色 - 等待
    ended: 'time-status-ended'              // 灰色 - 完成
  } as const,
  
  // 状态图标
  ICON: {
    endingSoon: 'fas fa-hourglass-end',
    active: 'fas fa-play-circle',
    coming: 'fas fa-clock',
    ended: 'fas fa-check-circle'
  } as const
}

// 分页配置
export const PROMOTION_PAGINATION_CONFIG = {
  // 前台默认每页数量
  FRONT_PAGE_SIZE: 8,
  // 后台默认每页数量
  ADMIN_PAGE_SIZE: 10,
  // 可选的每页数量
  PAGE_SIZES: [10, 20, 50]
}

// 图片配置
export const PROMOTION_IMAGE_CONFIG = {
  // 封面图片目录
  COVER_DIR: '/images/promotions/covers',
  // 海报图片目录
  POSTER_DIR: '/images/promotions/posters',
  // 默认占位图
  PLACEHOLDER: '/images/common/placeholder.svg',
  // 最大上传大小（字节）
  MAX_SIZE: 10 * 1024 * 1024  // 10MB
}

// ID 生成配置
export const PROMOTION_ID_CONFIG = {
  // ID 前缀
  PREFIX: 'A',
  // ID 数字部分长度
  PAD_LENGTH: 3
}

/**
 * 生成促销活动ID
 * @param num 数字部分
 * @returns 格式化的ID，如 "A001"
 */
export function generatePromotionId(num: number): string {
  return `${PROMOTION_ID_CONFIG.PREFIX}${String(num).padStart(PROMOTION_ID_CONFIG.PAD_LENGTH, '0')}`
}

/**
 * 从ID中提取数字部分
 * @param id 活动ID
 * @returns 数字部分，如果解析失败返回 0
 */
export function extractPromotionIdNum(id: string | number | undefined): number {
  if (!id) return 0
  const str = String(id)
  const match = str.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}
