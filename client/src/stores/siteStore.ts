import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'

// ========================================
// 类型定义
// ========================================

export interface ContactInfo {
  phones: string[]
  email: string
  address: string
  wechatQrcode: string
  gzhQrcode: string
  workTime: string
}

export interface CompanyInfo {
  name: string
  shortName: string
  englishName: string
  logo: string
}

export interface FriendLink {
  name: string
  url: string
}

export interface FooterLink {
  name: string
  path: string
}

export interface FloatingPanelConfig {
  phone: {
    emoji: string
    title: string
  }
  email: {
    emoji: string
    title: string
  }
  social: {
    emoji: string
    title: string
    wechatLabel: string
  }
  backToTop: {
    emoji: string
    title: string
    content: string
  }
}

// ========================================
// Store 定义
// ========================================

export const useSiteStore = defineStore('site', () => {
  // ========================================
  // State - 公司信息
  // ========================================
  const company = ref<CompanyInfo>({
    name: '广州信荣生物科技有限公司',
    shortName: '信荣生物',
    englishName: 'GUANGZHOU XINRONG BIOTECHNOLOGY CO., LTD.',
    logo: '/images/common/logo.png'
  })

  // ========================================
  // State - 联系信息
  // ========================================
  const contact = ref<ContactInfo>({
    phones: ['15919646073', '13422057239'],
    email: '15919646073@139.com',
    address: '广东省广州市黄埔区云埔街道双井东路2号鸫汇商业中心612',
    wechatQrcode: '/images/common/wx-qrcode-contact.png',
    gzhQrcode: '/images/common/gzh-qrcode.jpg',
    workTime: '周一至周五 8:00 - 17:30'
  })

  // ========================================
  // State - 友情链接
  // ========================================
  const friendLinks = ref<FriendLink[]>([
    { name: '锐竞平台', url: 'https://www.ringbio.com' },
    { name: '喀斯玛平台', url: 'https://www.casmart.com.cn' },
    { name: '丁香平台', url: 'https://www.dxy.cn' }
  ])

  // ========================================
  // State - 页脚导航链接
  // ========================================
  const footerLinks = ref<FooterLink[]>([
    { name: '产品中心', path: '/products' },
    { name: '资讯中心', path: '/promotions' },
    { name: '品牌中心', path: '/brands' },
    { name: '关于我们', path: '/about' }
  ])

  // ========================================
  // State - 悬浮面板配置
  // ========================================
  const floatingPanel = ref<FloatingPanelConfig>({
    phone: {
      emoji: '📞',
      title: '联系电话'
    },
    email: {
      emoji: '✉️',
      title: '邮箱地址'
    },
    social: {
      emoji: '💬',
      title: '扫码关注',
      wechatLabel: '微信客服'
    },
    backToTop: {
      emoji: '⬆️',
      title: '返回顶部',
      content: '点击回到页面顶部'
    }
  })

  // ========================================
  // State - 加载状态
  // ========================================
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  // ========================================
  // Actions
  // ========================================
  
  // 从 API 或 JSON 文件加载网站配置
  async function loadSiteConfig() {
    // 如果已经加载过，直接返回
    if (loaded.value) {
      return true
    }

    loading.value = true
    error.value = null

    try {
      // 优先从 API 加载
      const data = await contentApi.getPublishedOne<any>('site_config', 'main')
      
      // 更新 state
      if (data.company) company.value = data.company
      if (data.contact) contact.value = data.contact
      if (data.friendLinks) friendLinks.value = data.friendLinks
      if (data.footerLinks) footerLinks.value = data.footerLinks
      if (data.floatingPanel) floatingPanel.value = data.floatingPanel
      
      loaded.value = true
      return true
    } catch (e) {
      // API 失败时降级到静态 JSON
      console.warn('API 加载失败，降级到静态 JSON:', e)
      try {
        const response = await fetch('/data/site-config.json')
        if (response.ok) {
          const data = await response.json()
          if (data.company) company.value = data.company
          if (data.contact) contact.value = data.contact
          if (data.friendLinks) friendLinks.value = data.friendLinks
          if (data.footerLinks) footerLinks.value = data.footerLinks
          if (data.floatingPanel) floatingPanel.value = data.floatingPanel
          loaded.value = true
          return true
        }
      } catch {
        error.value = '加载网站配置失败'
      }
      return false
    } finally {
      loading.value = false
    }
  }

  // 清除缓存
  function clearCache() {
    loaded.value = false
    error.value = null
  }

  // ========================================
  // Getters
  // ========================================
  
  // 获取主要联系电话
  const primaryPhone = computed(() => contact.value.phones[0] || '')
  
  // 获取次要联系电话
  const secondaryPhone = computed(() => contact.value.phones[1] || '')

  // 获取版权信息
  const copyright = computed(() => {
    const year = new Date().getFullYear()
    return `© ${year} ${company.value.name} 版权所有`
  })

  // 悬浮面板完整数据（组合 contact 信息）
  const floatingPanelData = computed(() => ({
    phone: {
      ...floatingPanel.value.phone,
      phones: contact.value.phones.map((phone, index) => ({
        label: `号码 ${index + 1}`,
        number: phone
      }))
    },
    email: {
      ...floatingPanel.value.email,
      content: contact.value.email
    },
    social: {
      ...floatingPanel.value.social,
      wechat: {
        label: floatingPanel.value.social.wechatLabel,
        qrUrl: contact.value.wechatQrcode
      }
    },
    backToTop: floatingPanel.value.backToTop
  }))

  return {
    // State
    company,
    contact,
    friendLinks,
    footerLinks,
    floatingPanel,
    loading,
    loaded,
    error,
    
    // Actions
    loadSiteConfig,
    clearCache,
    
    // Getters
    primaryPhone,
    secondaryPhone,
    copyright,
    floatingPanelData
  }
})
