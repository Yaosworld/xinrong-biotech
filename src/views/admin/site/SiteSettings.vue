<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSiteStore } from '@/stores/siteStore'
import { useAdminStore } from '@/stores/adminStore'
import { ElMessage } from 'element-plus'

const siteStore = useSiteStore()
const adminStore = useAdminStore()

// 保存状态
const isSaving = ref(false)

// 表单数据 - 公司信息
const companyForm = ref({
  name: '',
  shortName: '',
  englishName: '',
  logo: ''
})

// 表单数据 - 联系信息
const contactForm = ref({
  phones: ['', ''],
  email: '',
  address: '',
  wechatQrcode: '',
  gzhQrcode: '',
  workTime: ''
})

// 表单数据 - 友情链接
const friendLinks = ref<{ name: string; url: string }[]>([])

// 表单数据 - 页脚链接
const footerLinks = ref<{ name: string; path: string }[]>([])

// 原始数据
const originalCompany = ref<typeof companyForm.value | null>(null)
const originalContact = ref<typeof contactForm.value | null>(null)
const originalFriendLinks = ref<typeof friendLinks.value | null>(null)
const originalFooterLinks = ref<typeof footerLinks.value | null>(null)

// 预览模式
const previewMode = ref<'footer' | 'floating' | 'contact'>('footer')

// 加载数据
const loadData = async () => {
  await siteStore.loadSiteConfig()
  
  companyForm.value = {
    name: siteStore.company.name,
    shortName: siteStore.company.shortName,
    englishName: siteStore.company.englishName,
    logo: siteStore.company.logo
  }
  
  contactForm.value = {
    phones: [...siteStore.contact.phones],
    email: siteStore.contact.email,
    address: siteStore.contact.address,
    wechatQrcode: siteStore.contact.wechatQrcode,
    gzhQrcode: siteStore.contact.gzhQrcode,
    workTime: siteStore.contact.workTime
  }
  
  friendLinks.value = JSON.parse(JSON.stringify(siteStore.friendLinks))
  footerLinks.value = JSON.parse(JSON.stringify(siteStore.footerLinks))
  
  while (contactForm.value.phones.length < 2) {
    contactForm.value.phones.push('')
  }
  
  originalCompany.value = { ...companyForm.value }
  originalContact.value = JSON.parse(JSON.stringify(contactForm.value))
  originalFriendLinks.value = JSON.parse(JSON.stringify(friendLinks.value))
  originalFooterLinks.value = JSON.parse(JSON.stringify(footerLinks.value))
}

// 添加电话
const addPhone = () => { contactForm.value.phones.push('') }
const removePhone = (index: number) => {
  if (contactForm.value.phones.length > 1) contactForm.value.phones.splice(index, 1)
}

// 添加友情链接
const addFriendLink = () => { friendLinks.value.push({ name: '', url: '' }) }
const removeFriendLink = (index: number) => { friendLinks.value.splice(index, 1) }

// 保存数据
const saveData = async () => {
  try {
    isSaving.value = true
    
    siteStore.company.name = companyForm.value.name
    siteStore.company.shortName = companyForm.value.shortName
    siteStore.company.englishName = companyForm.value.englishName
    siteStore.company.logo = companyForm.value.logo
    
    const validPhones = contactForm.value.phones.filter(p => p.trim())
    siteStore.contact.phones = validPhones
    siteStore.contact.email = contactForm.value.email
    siteStore.contact.address = contactForm.value.address
    siteStore.contact.wechatQrcode = contactForm.value.wechatQrcode
    siteStore.contact.gzhQrcode = contactForm.value.gzhQrcode
    siteStore.contact.workTime = contactForm.value.workTime
    
    siteStore.friendLinks.splice(0, siteStore.friendLinks.length, ...friendLinks.value.filter(l => l.name && l.url))
    siteStore.footerLinks.splice(0, siteStore.footerLinks.length, ...footerLinks.value)
    
    originalCompany.value = { ...companyForm.value }
    originalContact.value = JSON.parse(JSON.stringify(contactForm.value))
    originalFriendLinks.value = JSON.parse(JSON.stringify(friendLinks.value))
    originalFooterLinks.value = JSON.parse(JSON.stringify(footerLinks.value))
    
    adminStore.addActivity({ type: 'modify', target: 'site-settings', description: '修改了网站设置' })
    ElMessage.success('保存成功')
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

// 重置数据
const resetData = () => {
  if (originalCompany.value) companyForm.value = { ...originalCompany.value }
  if (originalContact.value) contactForm.value = JSON.parse(JSON.stringify(originalContact.value))
  if (originalFriendLinks.value) friendLinks.value = JSON.parse(JSON.stringify(originalFriendLinks.value))
  if (originalFooterLinks.value) footerLinks.value = JSON.parse(JSON.stringify(originalFooterLinks.value))
  ElMessage.info('已重置为上次保存的内容')
}

// 导出配置
const exportConfig = () => {
  const data = JSON.stringify({
    company: siteStore.company,
    contact: siteStore.contact,
    friendLinks: friendLinks.value,
    footerLinks: footerLinks.value
  }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `site-config-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
  adminStore.addActivity({ type: 'download', target: 'site-settings', description: '导出了网站配置' })
}

const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return url.startsWith('/') ? url : `/${url}`
}

const previewPhones = computed(() => contactForm.value.phones.filter(p => p.trim()))
const validFriendLinks = computed(() => friendLinks.value.filter(l => l.name && l.url))

onMounted(() => { loadData() })
</script>

<template>
  <div class="site-settings">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2><i class="fas fa-cog"></i> 网站设置</h2>
        <span class="subtitle">管理公司信息、联系方式和友情链接</span>
      </div>
      <div class="header-right">
        <el-button @click="resetData"><i class="fas fa-undo mr-1"></i> 重置</el-button>
        <el-button @click="exportConfig"><i class="fas fa-download mr-1"></i> 导出</el-button>
        <el-button type="primary" :loading="isSaving" @click="saveData"><i class="fas fa-save mr-1"></i> 保存</el-button>
      </div>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <!-- 编辑区域 - 左右布局 -->
      <div class="edit-area-split">
        <!-- 左侧面板：公司信息 + 友情链接 -->
        <div class="left-panels">
          <!-- 公司信息 -->
          <div class="edit-panel">
            <div class="panel-header"><h4><i class="fas fa-building"></i> 公司信息</h4></div>
            <div class="panel-body">
              <div class="form-grid">
                <div class="form-item">
                  <label>公司全称</label>
                  <el-input v-model="companyForm.name" placeholder="请输入公司全称" />
                </div>
                <div class="form-item">
                  <label>公司简称</label>
                  <el-input v-model="companyForm.shortName" placeholder="请输入公司简称" />
                </div>
                <div class="form-item full-width">
                  <label>英文名称</label>
                  <el-input v-model="companyForm.englishName" placeholder="请输入英文名称" />
                </div>
                <div class="form-item full-width">
                  <label>Logo 路径</label>
                  <el-input v-model="companyForm.logo" placeholder="如：/images/common/logo.png" />
                </div>
              </div>
              <div class="logo-preview-box">
                <span class="preview-label">Logo 预览</span>
                <div class="logo-preview">
                  <img v-if="companyForm.logo" :src="getImageUrl(companyForm.logo)" alt="Logo" />
                  <div v-else class="no-logo"><i class="fas fa-image"></i></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 友情链接 -->
          <div class="edit-panel">
            <div class="panel-header">
              <h4><i class="fas fa-link"></i> 友情链接</h4>
              <el-button size="small" type="primary" plain @click="addFriendLink"><i class="fas fa-plus mr-1"></i> 添加</el-button>
            </div>
            <div class="panel-body">
              <div class="links-list">
                <div v-for="(link, index) in friendLinks" :key="index" class="link-item">
                  <el-input v-model="link.name" placeholder="链接名称" style="width: 100px" size="small" />
                  <el-input v-model="link.url" placeholder="链接地址" style="flex: 1" size="small" />
                  <el-button type="danger" text circle size="small" @click="removeFriendLink(index)"><i class="fas fa-times"></i></el-button>
                </div>
                <div v-if="friendLinks.length === 0" class="empty-links">暂无友情链接，点击添加</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧面板：联系信息 -->
        <div class="right-panel">
          <div class="edit-panel full-height">
            <div class="panel-header"><h4><i class="fas fa-address-book"></i> 联系信息</h4></div>
            <div class="panel-body">
              <div class="form-section">
                <div class="section-title">
                  <span>联系电话</span>
                  <el-button size="small" type="primary" plain @click="addPhone"><i class="fas fa-plus mr-1"></i> 添加</el-button>
                </div>
                <div class="phones-list">
                  <div v-for="(_, index) in contactForm.phones" :key="index" class="phone-item">
                    <el-input v-model="contactForm.phones[index]" :placeholder="`电话 ${index + 1}`">
                      <template #prefix><i class="fas fa-phone-alt"></i></template>
                    </el-input>
                    <el-button v-if="contactForm.phones.length > 1" type="danger" text circle @click="removePhone(index)">
                      <i class="fas fa-times"></i>
                    </el-button>
                  </div>
                </div>
              </div>
              <div class="form-grid mt-4">
                <div class="form-item">
                  <label>邮箱地址</label>
                  <el-input v-model="contactForm.email" placeholder="请输入邮箱">
                    <template #prefix><i class="fas fa-envelope"></i></template>
                  </el-input>
                </div>
                <div class="form-item">
                  <label>工作时间</label>
                  <el-input v-model="contactForm.workTime" placeholder="如：周一至周五 8:00 - 17:30">
                    <template #prefix><i class="fas fa-clock"></i></template>
                  </el-input>
                </div>
                <div class="form-item full-width">
                  <label>公司地址</label>
                  <el-input v-model="contactForm.address" placeholder="请输入公司地址">
                    <template #prefix><i class="fas fa-map-marker-alt"></i></template>
                  </el-input>
                </div>
              </div>
              <div class="qrcode-section mt-4">
                <div class="qrcode-item">
                  <label>微信客服二维码</label>
                  <el-input v-model="contactForm.wechatQrcode" placeholder="图片路径" />
                  <div class="qrcode-preview">
                    <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" alt="微信" />
                    <i v-else class="fab fa-weixin"></i>
                  </div>
                </div>
                <div class="qrcode-item">
                  <label>公众号二维码</label>
                  <el-input v-model="contactForm.gzhQrcode" placeholder="图片路径" />
                  <div class="qrcode-preview">
                    <img v-if="contactForm.gzhQrcode" :src="getImageUrl(contactForm.gzhQrcode)" alt="公众号" />
                    <i v-else class="fab fa-weixin"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 预览区域 -->
      <div class="preview-area">
        <div class="preview-header">
          <div class="preview-title"><i class="fas fa-eye"></i><span>效果预览</span></div>
          <div class="preview-tabs">
            <span class="preview-tab" :class="{ active: previewMode === 'footer' }" @click="previewMode = 'footer'">页脚</span>
            <span class="preview-tab" :class="{ active: previewMode === 'floating' }" @click="previewMode = 'floating'">悬浮面板</span>
            <span class="preview-tab" :class="{ active: previewMode === 'contact' }" @click="previewMode = 'contact'">联系弹窗</span>
          </div>
        </div>
        
        <!-- 页脚预览 - 匹配 AppFooter -->
        <div v-if="previewMode === 'footer'" class="preview-content footer-preview">
          <div class="mock-footer">
            <div class="footer-main">
              <!-- 公司信息 -->
              <div class="footer-company">
                <div class="company-header">
                  <div class="company-logo">
                    <img v-if="companyForm.logo" :src="getImageUrl(companyForm.logo)" alt="Logo" />
                    <span v-else>XR</span>
                  </div>
                  <div class="company-info">
                    <div class="company-name">{{ companyForm.name || '公司名称' }}</div>
                    <div class="company-en">{{ companyForm.englishName || 'COMPANY NAME' }}</div>
                  </div>
                </div>
                <div class="qrcodes">
                  <div class="qr-item">
                    <div class="qr-box">
                      <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                      <i v-else class="fab fa-weixin"></i>
                    </div>
                    <span>微信客服</span>
                  </div>
                  <div class="qr-item">
                    <div class="qr-box">
                      <img v-if="contactForm.gzhQrcode" :src="getImageUrl(contactForm.gzhQrcode)" />
                      <i v-else class="fab fa-weixin"></i>
                    </div>
                    <span>微信公众号</span>
                  </div>
                </div>
              </div>
              <!-- 网站服务 -->
              <div class="footer-links">
                <h4>网站服务</h4>
                <ul>
                  <li v-for="link in footerLinks" :key="link.name">{{ link.name }}</li>
                </ul>
              </div>
              <!-- 友情链接 -->
              <div class="footer-links">
                <h4>友情链接</h4>
                <ul>
                  <li v-for="link in validFriendLinks" :key="link.name">{{ link.name }}</li>
                  <li v-if="validFriendLinks.length === 0" class="empty">暂无</li>
                </ul>
              </div>
              <!-- 联系我们 -->
              <div class="footer-contact">
                <h4>联系我们</h4>
                <div class="contact-item" v-for="phone in previewPhones" :key="phone">
                  <i class="fas fa-phone-alt"></i><span>{{ phone }}</span>
                </div>
                <div class="contact-item">
                  <i class="fas fa-envelope"></i><span>{{ contactForm.email || 'email@example.com' }}</span>
                </div>
                <div class="contact-item">
                  <i class="fas fa-map-marker-alt"></i><span>{{ contactForm.address || '公司地址' }}</span>
                </div>
              </div>
            </div>
            <div class="footer-copyright">© {{ new Date().getFullYear() }} {{ companyForm.name || '公司名称' }} 版权所有</div>
          </div>
        </div>

        <!-- 悬浮面板预览 - 横向4个按钮 -->
        <div v-if="previewMode === 'floating'" class="preview-content floating-preview">
          <div class="floating-panel-row">
            <!-- 电话 -->
            <div class="float-group">
              <div class="float-item phone">📞</div>
              <div class="float-tooltip">
                <div class="tooltip-title">联系电话</div>
                <div class="tooltip-phones">
                  <div v-for="(phone, i) in previewPhones" :key="i">号码 {{ i + 1 }}：<span class="phone-num">{{ phone }}</span></div>
                  <div v-if="previewPhones.length === 0">暂无电话</div>
                </div>
              </div>
            </div>
            <!-- 邮箱 -->
            <div class="float-group">
              <div class="float-item email">✉️</div>
              <div class="float-tooltip">
                <div class="tooltip-title">邮箱地址</div>
                <div>{{ contactForm.email || 'email@example.com' }}</div>
              </div>
            </div>
            <!-- 微信 -->
            <div class="float-group">
              <div class="float-item social">💬</div>
              <div class="float-tooltip">
                <div class="tooltip-title">扫码关注</div>
                <div class="tooltip-qr">
                  <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                  <i v-else class="fab fa-weixin"></i>
                </div>
              </div>
            </div>
            <!-- 返回顶部 -->
            <div class="float-group">
              <div class="float-item top">⬆️</div>
              <div class="float-tooltip">
                <div class="tooltip-title">返回顶部</div>
                <div>点击回到页面顶部</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 联系弹窗预览 - 匹配 ContactModal -->
        <div v-if="previewMode === 'contact'" class="preview-content contact-preview">
          <div class="mock-modal">
            <div class="modal-body">
              <div class="contact-cards">
                <!-- 微信客服 -->
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon green"><i class="fab fa-weixin"></i></div>
                    <div class="card-text">
                      <h4>微信客服</h4>
                      <p>扫码添加专属客服</p>
                    </div>
                  </div>
                  <div class="card-qr">
                    <img v-if="contactForm.wechatQrcode" :src="getImageUrl(contactForm.wechatQrcode)" />
                    <i v-else class="fab fa-weixin"></i>
                  </div>
                </div>
                <!-- 电话咨询 -->
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon blue"><i class="fas fa-phone-alt"></i></div>
                    <div class="card-text">
                      <h4>电话咨询</h4>
                      <p>欢迎致电咨询</p>
                    </div>
                  </div>
                  <div class="card-phones">
                    <div v-for="phone in previewPhones" :key="phone" class="phone-box">
                      <i class="fas fa-mobile-alt"></i><span>{{ phone }}</span>
                    </div>
                  </div>
                </div>
                <!-- 邮件咨询 -->
                <div class="contact-card">
                  <div class="card-header">
                    <div class="card-icon orange"><i class="fas fa-envelope"></i></div>
                    <div class="card-text">
                      <h4>邮件咨询</h4>
                      <p>商务合作与建议反馈</p>
                    </div>
                  </div>
                  <div class="card-email">
                    <div class="email-box"><i class="fas fa-at"></i><span>{{ contactForm.email || 'email@example.com' }}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.site-settings {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
}

.header-left h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-left h2 i { color: #667eea; }
.subtitle { display: block; margin-top: 4px; font-size: 13px; color: #999; }
.header-right { display: flex; gap: 8px; }
.content-area { padding: 20px 24px; }

/* 左右分栏布局 */
.edit-area-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.left-panels {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.right-panel {
  display: flex;
  flex-direction: column;
}

.edit-panel {
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
}

.edit-panel.full-height { flex: 1; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e8e8e8;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-header h4 i { color: #667eea; }
.panel-body { padding: 16px; }

.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full-width { grid-column: span 2; }
.form-item label { font-size: 13px; color: #666; font-weight: 500; }

.form-section { margin-bottom: 12px; }
.section-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 13px; color: #666; font-weight: 500; }
.phones-list { display: flex; flex-direction: column; gap: 8px; }
.phone-item { display: flex; align-items: center; gap: 8px; }
.phone-item .el-input { flex: 1; }

.logo-preview-box { margin-top: 14px; display: flex; align-items: center; gap: 12px; }
.preview-label { font-size: 13px; color: #666; }
.logo-preview { width: 100px; height: 50px; background: #f9fafb; border: 1px solid #e8e8e8; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
.no-logo { color: #ccc; font-size: 24px; }

.qrcode-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.qrcode-item { display: flex; flex-direction: column; gap: 8px; }
.qrcode-item label { font-size: 13px; color: #666; font-weight: 500; }
.qrcode-preview { width: 80px; height: 80px; background: #f9fafb; border: 1px solid #e8e8e8; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; color: #ccc; font-size: 28px; }
.qrcode-preview img { width: 100%; height: 100%; object-fit: contain; }

.links-list { display: flex; flex-direction: column; gap: 8px; }
.link-item { display: flex; align-items: center; gap: 8px; }
.empty-links { text-align: center; padding: 16px; color: #999; font-size: 13px; }

/* 预览区域 */
.preview-area { border: 1px solid #e8e8e8; border-radius: 10px; overflow: hidden; }
.preview-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e8e8e8; }
.preview-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: #333; }
.preview-title i { color: #667eea; }
.preview-tabs { display: flex; gap: 4px; }
.preview-tab { padding: 6px 14px; font-size: 13px; color: #666; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.preview-tab:hover { background: rgba(102, 126, 234, 0.1); color: #667eea; }
.preview-tab.active { background: #667eea; color: #fff; }
.preview-content { padding: 20px; min-height: 320px; background: #f5f5f5; }

/* 页脚预览 */
.mock-footer { background: #1a1a2e; border-radius: 8px; overflow: hidden; }
.footer-main { display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 20px; padding: 20px; }
.footer-company { color: #fff; }
.company-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.company-logo { width: 40px; height: 40px; background: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.company-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
.company-logo span { font-weight: bold; color: #667eea; }
.company-name { font-size: 13px; font-weight: 600; }
.company-en { font-size: 8px; color: rgba(255,255,255,0.5); }
.qrcodes { display: flex; gap: 12px; }
.qr-item { text-align: center; }
.qr-box { width: 50px; height: 50px; background: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; overflow: hidden; }
.qr-box img { width: 100%; height: 100%; object-fit: contain; }
.qr-box i { color: #07c160; font-size: 24px; }
.qr-item span { font-size: 9px; color: rgba(255,255,255,0.7); }
.footer-links { color: #fff; }
.footer-links h4 { margin: 0 0 10px; font-size: 12px; font-weight: 600; }
.footer-links ul { list-style: none; padding: 0; margin: 0; }
.footer-links li { font-size: 11px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.footer-links li.empty { font-style: italic; }
.footer-contact { color: #fff; }
.footer-contact h4 { margin: 0 0 10px; font-size: 12px; font-weight: 600; }
.footer-contact .contact-item { display: flex; align-items: flex-start; gap: 6px; font-size: 10px; color: rgba(255,255,255,0.6); margin-bottom: 6px; }
.footer-contact .contact-item i { margin-top: 2px; font-size: 9px; }
.footer-copyright { background: rgba(0,0,0,0.3); padding: 10px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.5); }

/* 悬浮面板预览 - 横向排列 */
.floating-preview { display: flex; justify-content: center; align-items: center; }
.floating-panel-row { display: flex; gap: 40px; align-items: flex-start; }
.float-group { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.float-item { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; cursor: pointer; border: 3px solid #333; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.float-item.phone { background: linear-gradient(45deg, #10b981, #1cc285); }
.float-item.email { background: linear-gradient(45deg, #f59e0b, #fbbf24); }
.float-item.social { background: linear-gradient(45deg, #d84040, #d84040); }
.float-item.top { background: linear-gradient(45deg, #6366f1, #8b5cf6); }
.float-tooltip { background: #fff; padding: 12px 16px; border-radius: 10px; border: 2px solid #333; box-shadow: 0 4px 12px rgba(0,0,0,0.1); min-width: 140px; font-size: 12px; text-align: center; }
.tooltip-title { font-weight: 600; color: #333; margin-bottom: 6px; font-size: 13px; }
.tooltip-phones { color: #666; text-align: left; }
.phone-num { color: #2563eb; font-weight: 500; }
.tooltip-qr { width: 80px; height: 80px; background: #f0f0f0; border-radius: 6px; display: flex; align-items: center; justify-content: center; margin: 8px auto 0; overflow: hidden; }
.tooltip-qr img { width: 100%; height: 100%; object-fit: contain; }
.tooltip-qr i { font-size: 32px; color: #07c160; }

/* 联系弹窗预览 - 匹配 ContactModal */
.contact-preview { display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
.mock-modal { background: #fff; border-radius: 20px; box-shadow: 0 8px 30px rgba(0,0,0,0.15); width: 100%; max-width: 700px; overflow: hidden; }
.modal-header { text-align: center; padding: 32px 24px 20px; }
.header-icon { width: 56px; height: 56px; background: #eff6ff; color: #3b82f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px; }
.modal-header h3 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 8px; }
.modal-header p { color: #6b7280; font-size: 13px; margin: 0; }
.work-time-badge { display: inline-flex; align-items: center; gap: 8px; margin-top: 12px; padding: 6px 16px; background: #f3f4f6; border-radius: 999px; color: #4b5563; font-size: 12px; }
.work-time-badge i { color: #3b82f6; }
.modal-body { padding: 16px 24px 32px; }
.contact-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.contact-card { background: #fff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 20px 16px; text-align: center; transition: all 0.3s; }
.contact-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
.card-header { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px; }
.card-icon { width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
.card-icon.green { background: #dcfce7; color: #16a34a; }
.card-icon.blue { background: #dbeafe; color: #2563eb; }
.card-icon.orange { background: #ffedd5; color: #ea580c; }
.card-text { text-align: left; }
.card-text h4 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: #1f2937; }
.card-text p { margin: 0; font-size: 11px; color: #9ca3af; }
.card-qr { width: 80px; height: 80px; margin: 0 auto; padding: 4px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
.card-qr img { width: 100%; height: 100%; object-fit: contain; border-radius: 6px; }
.card-qr i { font-size: 40px; color: #07c160; }
.card-phones { display: flex; flex-direction: column; gap: 8px; }
.phone-box { display: flex; align-items: center; padding: 10px 12px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #1f2937; }
.phone-box i { margin-right: 10px; color: #9ca3af; font-size: 12px; }
.card-email { display: flex; justify-content: center; }
.email-box { display: flex; align-items: center; padding: 10px 16px; background: #f9fafb; border-radius: 8px; font-size: 13px; color: #1f2937; }
.email-box i { margin-right: 10px; color: #9ca3af; }

.mr-1 { margin-right: 4px; }
.mt-4 { margin-top: 16px; }

@media (max-width: 1200px) {
  .edit-area-split { grid-template-columns: 1fr; }
  .footer-main { grid-template-columns: 1fr 1fr; }
  .contact-cards { grid-template-columns: 1fr; }
}
</style>
