// ========================================
// 页面内容视图类型定义
// ========================================

/**
 * Section 标题配置
 */
export interface SectionTitleConfig {
  badge?: string
  title?: string
}

/**
 * 页面板块接口
 */
export interface PageSection {
  id: string
  title: string
  type: 'text' | 'gallery' | 'features' | 'timeline' | 'stats' | 'cards'
  items: any[]
}

/**
 * 页面内容接口
 */
export interface PageContent {
  id: string
  title: string
  sections?: PageSection[]
  showcase?: ShowcaseContent
  content?: any
  [key: string]: any
}

/**
 * Showcase 展示区内容
 */
export interface ShowcaseContent {
  summaryLines?: string[]
  stats?: StatItem[]
}

/**
 * 统计项
 */
export interface StatItem {
  key: string
  number: string
  label: string
}

/**
 * 网站信息接口
 */
export interface SiteInfo {
  name: string
  logo: string
  contact: {
    phone: string
    email: string
    address: string
  }
  socials: {
    wechat?: string
    linkedin?: string
    weibo?: string
  }
  footer: {
    copyright: string
    links: FooterLink[]
  }
}

/**
 * 底部链接
 */
export interface FooterLink {
  title: string
  url: string
}

/**
 * 首页内容
 */
export interface HomePageContent extends PageContent {
  hero: {
    title: string
    subtitle: string
    backgroundImage?: string
    ctaButtons?: {
      text: string
      url: string
      type: 'primary' | 'secondary'
    }[]
  }
  sections: PageSection[]
}

/**
 * 产品中心页面配置
 */
export interface ProductCenterContent extends PageContent {
  showcase: ShowcaseContent
  content: {
    productSection: {
      searchPlaceholder: string
      filterLabels: {
        category: string
        brand: string
      }
    }
  }
}

/**
 * 品牌中心页面配置
 */
export interface BrandCenterContent extends PageContent {
  showcase: ShowcaseContent
  brandSections: {
    ownBrandsSection: BrandSectionConfig
    selectedBrandsSection: BrandSectionConfig
  }
}

/**
 * 品牌区块配置
 */
export interface BrandSectionConfig {
  id: string
  mainTitle: string
  subTitle: string
}

/**
 * 促销中心页面配置
 */
export interface PromotionCenterContent extends PageContent {
  showcase: ShowcaseContent
  content: {
    id: string
    title: string
  }
}

/**
 * 关于我们页面配置
 */
export interface AboutPageContent extends PageContent {
  sections: PageSection[]
}

/**
 * 时间线项
 */
export interface TimelineItem {
  year: string
  title: string
  description: string
}

/**
 * 特性项
 */
export interface FeatureItem {
  icon: string
  title: string
  description: string
}

