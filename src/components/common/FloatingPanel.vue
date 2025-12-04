<template>
  <!-- 右侧悬浮面板 -->
  <div class="floating-panel" v-if="floatingPanel">
    <div
      class="floating-item phone"
      @mouseenter="showTooltip('phone')"
      @mouseleave="hideTooltip"
    >
      {{ floatingPanel.phone.emoji }}
      <div
        class="floating-tooltip"
        :class="{ visible: tooltipVisible === 'phone' }"
      >
        <div class="tooltip-title">{{ floatingPanel.phone.title }}</div>
        <div class="tooltip-content">
          <div v-for="(phone, index) in floatingPanel.phone.phones" :key="index" class="phone-item">
            <span class="phone-label">{{ phone.label }}：</span>
            <span class="phone-number">{{ phone.number }}</span>
          </div>
        </div>
      </div>
    </div>

    <div
      class="floating-item email"
      @mouseenter="showTooltip('email')"
      @mouseleave="hideTooltip"
    >
      {{ floatingPanel.email.emoji }}
      <div
        class="floating-tooltip"
        :class="{ visible: tooltipVisible === 'email' }"
      >
        <div class="tooltip-title">{{ floatingPanel.email.title }}</div>
        <div class="tooltip-content">
          {{ floatingPanel.email.content }}
        </div>
      </div>
    </div>

    <div
      class="floating-item social"
      @mouseenter="showTooltip('social')"
      @mouseleave="hideTooltip"
    >
      {{ floatingPanel.social.emoji }}
      <div
        class="floating-tooltip social-tooltip"
        :class="{ visible: tooltipVisible === 'social' }"
      >
        <div class="tooltip-title">{{ floatingPanel.social.title }}</div>
        <div class="tooltip-content">
          <div class="social-container">
            <div class="social-column">
              <div class="social-label">{{ floatingPanel.social.wechat.label }}</div>
              <div class="qr-code">
                <img :src="getFullImageUrl(floatingPanel.social.wechat.qrUrl)" alt="微信二维码" class="qr-image" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      class="floating-item back-to-top"
      @click="backToTop"
      @mouseenter="showTooltip('top')"
      @mouseleave="hideTooltip"
    >
      {{ floatingPanel.backToTop.emoji }}
      <div
        class="floating-tooltip"
        :class="{ visible: tooltipVisible === 'top' }"
      >
        <div class="tooltip-title">{{ floatingPanel.backToTop.title }}</div>
        <div class="tooltip-content">{{ floatingPanel.backToTop.content }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

// 本地悬浮面板配置数据
const floatingPanel = ref({
  phone: {
    emoji: '📞',
    title: '联系电话',
    phones: [
      { label: '号码 1', number: '15919646073' },
      { label: '号码 2', number: '13422057239' }
    ]
  },
  email: {
    emoji: '✉️',
    title: '邮箱地址',
    content: '15919646073@139.com'
  },
  social: {
    emoji: '💬',
    title: '扫码关注',
    wechat: {
      label: '微信客服',
      qrUrl: '/images/common/wx-qrcode-contact.png'
    }
  },
  backToTop: {
    emoji: '⬆️',
    title: '返回顶部',
    content: '点击回到页面顶部'
  }
});

// 提示框显示状态
const tooltipVisible = ref<string | null>(null);

// 显示提示框
const showTooltip = (type: string) => {
  tooltipVisible.value = type;
};

// 隐藏提示框
const hideTooltip = () => {
  tooltipVisible.value = null;
};

// 获取完整图片URL
function getFullImageUrl(path: string): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // 确保以 / 开头
  return path.startsWith('/') ? path : `/${path}`
}

// 返回顶部功能
const backToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};
</script>

<style scoped>
/* 右侧悬浮面板 */
.floating-panel {
  position: fixed;
  right: 30px;
  bottom: 30px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.floating-item {
  position: relative;
  width: 60px;
  height: 60px;
  background: linear-gradient(45deg, #2563eb, #3b82f6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #080808;
  color: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
}

.floating-item:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 25px rgba(37, 99, 235, 0.4);
}

.floating-item.phone {
  background: linear-gradient(45deg, #10b981, #1cc285);
}

.floating-item.email {
  background: linear-gradient(45deg, #f59e0b, #fbbf24);
}

.floating-item.social {
  background: linear-gradient(45deg, #d84040, #d84040);
}

.floating-item.back-to-top {
  background: linear-gradient(45deg, #6366f1, #8b5cf6);
}

.floating-item.back-to-top:hover {
  box-shadow: 0 6px 25px rgba(16, 185, 129, 0.4);
}

/* 提示框样式 */
.floating-tooltip {
  position: absolute;
  right: 70px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  padding: 15px 20px;
  border-radius: 12px;
  border: 2px solid #080808;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  min-width: 200px;
  z-index: 1000;
}

.floating-item:hover .floating-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(-50%) translateX(-5px);
}

.floating-tooltip::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border: 8px solid transparent;
  border-left-color: white;
}

.tooltip-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.tooltip-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.phone-item {
  margin-bottom: 5px;
}

.phone-item:last-child {
  margin-bottom: 0;
}

.phone-label {
  font-weight: 600;
  color: #333;
  margin-right: 5px;
}

.phone-number {
  color: #2563eb;
  font-weight: 500;
}

/* 社交媒体特殊样式 */
.social-tooltip {
  min-width: 200px;
}

.social-container {
  display: flex;
  gap: 15px;
}

.social-column {
  flex: 1;
  text-align: center;
}

.social-label {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.qr-code {
  width: 120px;
  height: 120px;
  background: #f0f0f0;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  color: #999;
  font-size: 11px;
  text-align: center;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

</style>
