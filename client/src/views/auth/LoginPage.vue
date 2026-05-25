<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useSiteStore } from '@/stores/siteStore'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const siteStore = useSiteStore()

const form = reactive({
  username: '',
  password: '',
  remember: false
})

const loading = ref(false)
const showPassword = ref(false)

const loginSubtitle = computed(() => {
  return siteStore.company.name || siteStore.company.shortName || '内容管理后台'
})

async function handleLogin() {
  if (!form.username.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!form.password) {
    ElMessage.warning('请输入密码')
    return
  }
  
  loading.value = true
  try {
    const res = await authStore.login(form.username, form.password)
    
    if (res.success) {
      ElMessage.success('登录成功')
      const redirect = route.query.redirect as string
      router.push(redirect || '/admin')
    } else {
      ElMessage.error(res.error?.message || '登录失败')
    }
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : '无法连接后台服务，请确认 CMS 后端已启动'
    ElMessage.error(message)
  } finally {
    loading.value = false
  }
}

function goHome() {
  router.push('/')
}

onMounted(() => {
  if (!siteStore.loaded && !siteStore.loading) {
    siteStore.loadSiteConfig()
  }
})
</script>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="decoration-dot" style="width: 120px; height: 120px; top: 10%; left: 5%;"></div>
      <div class="decoration-dot" style="width: 80px; height: 80px; top: 20%; right: 10%;"></div>
      <div class="decoration-dot" style="width: 60px; height: 60px; bottom: 30%; left: 15%;"></div>
      <div class="decoration-dot" style="width: 100px; height: 100px; bottom: 15%; right: 5%;"></div>
    </div>
    
    <div class="login-card">
      <div class="login-logo">
        <i class="fas fa-flask"></i>
      </div>
      
      <h1 class="login-title">后台管理系统</h1>
      <p class="login-subtitle">{{ loginSubtitle }}</p>
      
      <form class="login-form" @submit.prevent="handleLogin">
        <div class="form-item">
          <div class="input-wrapper">
            <i class="fas fa-user input-icon"></i>
            <input v-model="form.username" type="text" placeholder="请输入用户名" class="login-input" autocomplete="username" />
          </div>
        </div>
        
        <div class="form-item">
          <div class="input-wrapper">
            <i class="fas fa-lock input-icon"></i>
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="请输入密码" class="login-input" autocomplete="current-password" />
            <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="toggle-password" @click="showPassword = !showPassword"></i>
          </div>
        </div>
        
        <div class="form-item remember">
          <label class="checkbox-label">
            <input v-model="form.remember" type="checkbox" />
            <span>记住登录状态</span>
          </label>
        </div>
        
        <button type="submit" class="login-btn" :disabled="loading">
          <i v-if="loading" class="fas fa-spinner fa-spin"></i>
          <span>{{ loading ? '登录中...' : '登 录' }}</span>
        </button>
      </form>
      
      <div class="back-home" @click="goHome">
        <i class="fas fa-arrow-left"></i>
        <span>返回首页</span>
      </div>
    </div>
  </div>
</template>


<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #05548C, #43CEED);
  position: relative;
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.decoration-dot {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  animation: floatDot 6s ease-in-out infinite;
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.decoration-dot:nth-child(odd) { animation-duration: 8s; }
.decoration-dot:nth-child(3) { animation-duration: 10s; }

@keyframes floatDot {
  0%, 100% { transform: translateY(0) translateX(0); opacity: 0.5; }
  25% { transform: translateY(-15px) translateX(5px); opacity: 0.8; }
  50% { transform: translateY(-8px) translateX(-5px); opacity: 0.6; }
  75% { transform: translateY(-20px) translateX(3px); opacity: 0.9; }
}

.login-card {
  width: 100%;
  max-width: 400px;
  margin: 20px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 10;
}

.login-logo {
  width: 72px;
  height: 72px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(5, 84, 140, 0.4);
}

.login-logo i { font-size: 32px; color: #fff; }

.login-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  text-align: center;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: #999;
  text-align: center;
  margin-bottom: 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-item { width: 100%; }

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  color: #999;
  font-size: 16px;
  transition: color 0.2s;
}

.login-input {
  width: 100%;
  height: 48px;
  padding: 0 44px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  font-size: 15px;
  color: #333;
  transition: all 0.2s;
  outline: none;
}

.login-input:focus { border-color: #05548C; }
.login-input:focus ~ .input-icon { color: #05548C; }
.login-input::placeholder { color: #bbb; }

.toggle-password {
  position: absolute;
  right: 16px;
  color: #999;
  cursor: pointer;
  transition: color 0.2s;
}

.toggle-password:hover { color: #05548C; }

.remember { margin-top: -8px; }

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  accent-color: #05548C;
}

.login-btn {
  width: 100%;
  height: 48px;
  background: linear-gradient(135deg, #05548C, #43CEED);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(5, 84, 140, 0.4);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 84, 140, 0.5);
}

.login-btn:disabled { opacity: 0.7; cursor: not-allowed; }

.back-home {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  transition: color 0.2s;
}

.back-home:hover { color: #05548C; }

@media (max-width: 480px) {
  .login-card { padding: 32px 24px; }
  .login-logo { width: 60px; height: 60px; }
  .login-logo i { font-size: 28px; }
  .login-title { font-size: 20px; }
}
</style>
