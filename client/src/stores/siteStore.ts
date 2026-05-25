import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { contentApi } from '@/api/contentApi'

// ========================================
// 类型定义
// ========================================

export interface ContactInfo {
  phones: string[]
  email: string
  qq: string
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

export interface FooterMeta {
  copyrightText: string
  icpNumber: string
  icpUrl: string
  publicSecurityNumber: string
  publicSecurityUrl: string
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
    name: '',
    shortName: '',
    englishName: '',
    logo: ''
  })

  // ========================================
  // State - 联系信息
  // ========================================
  const contact = ref<ContactInfo>({
    phones: [],
    email: '',
    qq: '',
    address: '',
    wechatQrcode: '',
    gzhQrcode: '',
    workTime: ''
  })

  // ========================================
  // State - 友情链接
  // ========================================
  const friendLinks = ref<FriendLink[]>([])

  // ========================================
  // State - 页脚导航链接
  // ========================================
  const footerLinks = ref<FooterLink[]>([])

  // ========================================
  // State - 页脚附加信息
  // ========================================
  const footerMeta = ref<FooterMeta>({
    copyrightText: '',
    icpNumber: '',
    icpUrl: '',
    publicSecurityNumber: '',
    publicSecurityUrl: ''
  })

  // ========================================
  // State - 悬浮面板配置
  // ========================================
  const floatingPanel = ref<FloatingPanelConfig>({
    phone: {
      emoji: '',
      title: ''
    },
    email: {
      emoji: '',
      title: ''
    },
    social: {
      emoji: '',
      title: '',
      wechatLabel: ''
    },
    backToTop: {
      emoji: '',
      title: '',
      content: ''
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
  
  // 从 API 加载网站配置
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
      if (data.footerMeta) footerMeta.value = data.footerMeta
      if (data.floatingPanel) floatingPanel.value = data.floatingPanel
      
      loaded.value = true
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载网站配置失败'
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
    return footerMeta.value.copyrightText
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
      content: contact.value.email,
      qq: contact.value.qq
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
    footerMeta,
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
