<script setup lang="ts">
import { defineProps, defineEmits, computed, ref } from 'vue'

interface ContactInfo {
  phone1?: string
  phone2?: string
  email?: string
  wechatQrcode?: string
  workTime?: string
}

const props = defineProps<{
  show: boolean
  contactInfo?: ContactInfo
}>()

const emit = defineEmits<{
  close: []
}>()

// 默认联系信息
const defaultContactInfo: ContactInfo = {
  phone1: '15919646073',
  phone2: '13422057239',
  email: '15919646073@139.com',
  wechatQrcode: '/images/common/wx-qrcode-contact.png',
  workTime: '周一至周五 8:00 - 17:30'
}

// 合并联系信息
const mergedContactInfo = computed(() => {
  return { ...defaultContactInfo, ...props.contactInfo }
})

// 二维码加载状态管理
const showQrcodePlaceholder = ref(false)
const handleQrcodeLoad = () => { showQrcodePlaceholder.value = false }
const handleQrcodeError = () => { showQrcodePlaceholder.value = true }

// 关闭弹窗
const closeModal = () => {
  emit('close')
  // 重置状态（可选）
  setTimeout(() => {
    showQrcodePlaceholder.value = false
  }, 300)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          
          <!-- 关闭按钮 (移出滚动区域，实现固定定位) -->
          <button class="modal-close-btn" @click="closeModal" aria-label="关闭">
            <i class="fas fa-times"></i>
          </button>

          <!-- 滚动内容区域 -->
          <div class="modal-scroll-area">
            <!-- 头部区域 -->
            <div class="modal-header">
              <div class="header-icon-wrapper">
                <i class="fas fa-headset"></i>
              </div>
              <h3 class="modal-title">联系我们</h3>
              <p class="modal-subtitle">如果您有任何疑问或需求，请通过以下方式联系我们</p>
              
              <!-- 工作时间展示 -->
              <div class="header-work-time">
                <i class="far fa-clock"></i>
                <span>服务时间：{{ mergedContactInfo.workTime }}</span>
              </div>
            </div>

            <!-- 核心内容区 -->
            <div class="contact-grid">
              
              <!-- 卡片1：微信客服 -->
              <div class="contact-card wechat-card">
                <div class="wechat-header">
                  <div class="card-icon-bg bg-green-100 text-green-600">
                    <i class="fab fa-weixin"></i>
                  </div>
                  <div class="wechat-text">
                    <h4 class="card-title">微信客服</h4>
                    <p class="card-desc">扫码添加专属客服</p>
                  </div>
                </div>

                <div class="qrcode-wrapper">
                  <div class="qrcode-box">
                    <img
                      :src="mergedContactInfo.wechatQrcode"
                      alt="微信二维码"
                      class="qrcode-img"
                      @load="handleQrcodeLoad"
                      @error="handleQrcodeError"
                    />
                    <!-- 加载失败占位 -->
                    <div v-if="showQrcodePlaceholder" class="qrcode-error">
                      <i class="fas fa-image text-gray-400 text-2xl mb-2"></i>
                      <span class="text-xs text-gray-400">二维码加载失败</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 卡片2：电话咨询 -->
              <div class="contact-card phone-card">
                <div class="phone-header">
                  <div class="card-icon-bg bg-blue-100 text-blue-600">
                    <i class="fas fa-phone-alt"></i>
                  </div>
                  <div class="phone-text">
                    <h4 class="card-title">电话咨询</h4>
                    <!-- 修改文案，避免与服务时间冲突 -->
                    <p class="card-desc">欢迎致电咨询</p>
                  </div>
                </div>

                <div class="action-list">
                  <!-- 改为 div 且移除点击交互 -->
                  <div class="info-box">
                    <span class="action-icon"><i class="fas fa-mobile-alt"></i></span>
                    <span class="action-text">{{ mergedContactInfo.phone1 }}</span>
                  </div>
                  <div class="info-box">
                    <span class="action-icon"><i class="fas fa-mobile-alt"></i></span>
                    <span class="action-text">{{ mergedContactInfo.phone2 }}</span>
                  </div>
                </div>
              </div>

              <!-- 卡片3：邮件咨询 -->
              <div class="contact-card email-card">
                <div class="email-header">
                  <div class="card-icon-bg bg-orange-100 text-orange-600">
                    <i class="fas fa-envelope"></i>
                  </div>
                  <div class="email-text">
                    <h4 class="card-title">邮件咨询</h4>
                    <p class="card-desc">商务合作与建议反馈</p>
                  </div>
                </div>

                <div class="action-list center-content">
                  <!-- 改为 div，移除点击，内容不换行 -->
                  <div class="info-box email-box">
                    <span class="action-icon"><i class="fas fa-at"></i></span>
                    <span class="action-text">{{ mergedContactInfo.email }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- 底部装饰条 (可选) -->
            <div class="modal-footer-decoration"></div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 颜色变量定义 */
.modal-overlay {
  --c-bg: #ffffff;
  --c-text-primary: #1f2937;
  --c-text-secondary: #6b7280;
  --c-accent: #3b82f6;
  --c-border: #e5e7eb;
  --c-hover-bg: #f9fafb;
  
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

/* 弹窗容器 */
.modal-container {
  background: var(--c-bg);
  border-radius: 20px;
  width: 100%;
  max-width: 960px;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 90vh;
  animation: modal-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 内部滚动区域 */
.modal-scroll-area {
  overflow-y: auto;
  flex: 1;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}

/* 自定义滚动条样式 (Webkit) */
.modal-scroll-area::-webkit-scrollbar {
  width: 6px;
}
.modal-scroll-area::-webkit-scrollbar-track {
  background: transparent;
}
.modal-scroll-area::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}
.modal-scroll-area::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* 关闭按钮 */
.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(243, 244, 246, 0.8);
  backdrop-filter: blur(4px);
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 20;
}

.modal-close-btn:hover {
  background: #e5e7eb;
  color: #4b5563;
  transform: rotate(90deg);
}

/* 头部样式 */
.modal-header {
  text-align: center;
  padding: 48px 32px 24px;
  flex-shrink: 0;
}

.header-icon-wrapper {
  width: 56px;
  height: 56px;
  background: #eff6ff;
  color: #3b82f6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin: 0 auto 16px;
}

.modal-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--c-text-primary);
  margin: 0 0 8px;
  letter-spacing: -0.025em;
  word-wrap: break-word;
}

.modal-subtitle {
  color: var(--c-text-secondary);
  font-size: 15px;
  max-width: 80%;
  margin: 0 auto;
  line-height: 1.5;
}

.header-work-time {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  padding: 6px 16px;
  background-color: #f3f4f6;
  border-radius: 999px;
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
}

.header-work-time i {
  margin-right: 8px;
  color: var(--c-accent);
}

/* 网格布局 */
.contact-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 20px 48px 64px;
}

/* 卡片通用样式 */
.contact-card {
  background: #fff;
  border: 1px solid #f3f4f6;
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  height: 100%;
}

.contact-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08);
  border-color: transparent;
  z-index: 2;
}

/* 图标背景色 */
.card-icon-bg {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  margin-bottom: 20px;
  flex-shrink: 0;
  transition: transform 0.3s;
}

/* 各个卡片的图标特殊处理 */
.wechat-card .card-icon-bg,
.phone-card .card-icon-bg,
.email-card .card-icon-bg {
  margin-bottom: 0;
}

.contact-card:hover .card-icon-bg {
  transform: scale(1.1);
}

.bg-green-100 { background-color: #dcfce7; color: #16a34a; }
.bg-blue-100 { background-color: #dbeafe; color: #2563eb; }
.bg-orange-100 { background-color: #ffedd5; color: #ea580c; }

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text-primary);
  margin: 0 0 8px;
}

.card-desc {
  font-size: 13px;
  color: #9ca3af;
  margin: 0 0 0; /* 移除底部 margin，让内容自然跟随 */
}

/* 微信头部区域 */
.wechat-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.wechat-text {
  text-align: left;
}

/* 电话头部区域 */
.phone-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.phone-text {
  text-align: left;
}

/* 邮件头部区域 */
.email-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.email-text {
  text-align: left;
}

/* 微信二维码区域 */
.qrcode-wrapper {
  /* 移除 margin-top: auto，改为固定间距 */
  margin-top: 24px;
  width: 100%;
  display: flex;
  justify-content: center;
}

.qrcode-box {
  width: 100px;
  height: 100px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  position: relative;
}

.qrcode-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 8px;
}

.qrcode-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 12px;
}

/* 按钮列表区域 */
.action-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  /* 移除 margin-top: auto，改为固定间距 */
  margin-top: 24px;
}

.action-list.center-content {
  justify-content: center;
  align-items: center;
}

/* 信息展示框 (原 action-btn，现改为纯展示) */
.info-box {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid transparent;
  border-radius: 10px;
  color: var(--c-text-primary);
  font-weight: 500;
  width: 100%; 
  cursor: default;
}

.action-icon {
  margin-right: 12px;
  color: #9ca3af;
  font-size: 14px;
  flex-shrink: 0;
}

/* 文本处理 */
.action-text {
  flex: 1;
  text-align: left;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 15px;
}

/* 邮件框特殊处理：不换行，自适应宽度 */
.email-box {
  width: auto;         
  min-width: 100%;    
  justify-content: center;
  white-space: nowrap; 
}

.email-box .action-text {
  text-align: center;
  font-family: inherit; 
  flex: initial;       
}

/* 动画定义 */
@keyframes modal-slide-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 860px) {
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .contact-card:last-child {
    grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: 0;
  }

  .modal-container {
    height: 100%;
    max-height: 100%;
    border-radius: 0;
    width: 100%;
  }
  
  .contact-grid {
    grid-template-columns: 1fr;
    padding: 20px 20px 60px;
  }
  
  .contact-card:last-child {
    grid-column: auto;
  }
  
  .modal-header {
    padding: 32px 20px 10px;
  }
  
  .modal-title {
    font-size: 24px;
  }
  
  .contact-card {
    flex-direction: row;
    padding: 20px;
    text-align: left;
    align-items: flex-start;
    min-height: auto;
  }
  
  .card-icon-bg {
    width: 48px;
    height: 48px;
    font-size: 20px;
    margin-right: 16px;
    margin-bottom: 0;
  }
  
  .contact-card.wechat-card {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  
  .contact-card.wechat-card .card-icon-bg {
    margin-right: 0;
    margin-bottom: 16px;
  }
  
  .contact-card > div:not(.card-icon-bg) {
    flex: 1;
    min-width: 0;
  }
  
  .action-list {
    margin-top: 12px;
  }
  
  .qrcode-wrapper {
    margin-top: 16px;
  }

  .modal-close-btn {
    top: 12px;
    right: 12px;
    background: #f3f4f6;
  }
}
</style>