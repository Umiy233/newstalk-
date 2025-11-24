<template>
  <div class="login-page">
    <div class="login-background">
      <div class="orb orb-1"></div>
      <div class="orb orb-2"></div>
    </div>
    
    <div class="login-card glass">
      <div class="card-header">
        <div class="logo">News</div>
        <h2>欢迎回来</h2>
        <p class="subtitle">登录以发现更多精彩内容</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <div class="input-wrapper">
            <span class="icon">👤</span>
            <input
              id="username"
              v-model="form.username"
              type="text"
              placeholder="用户名 / 邮箱"
              required
              autocomplete="username"
            />
          </div>
        </div>

        <div class="form-group">
          <div class="input-wrapper">
            <span class="icon">🔒</span>
            <input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="密码"
              required
              autocomplete="current-password"
            />
          </div>
        </div>

        <button type="submit" class="submit-btn" :disabled="isLoading">
          <span v-if="!isLoading">登录</span>
          <span v-else class="loader"></span>
        </button>

        <div v-if="error" class="error-msg">
          {{ error }}
        </div>
      </form>

      <div class="card-footer">
        <p>还没有账号？ <router-link to="/register">立即注册</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = ref({
  username: '',
  password: '',
})

const isLoading = ref(false)
const error = ref('')

const handleLogin = async () => {
  isLoading.value = true
  error.value = ''

  try {
    await authStore.login(form.value.username, form.value.password)
    const redirect = route.query.redirect as string || '/feed'
    router.push(redirect)
  } catch (err: any) {
    error.value = err.response?.data?.message || '登录失败，请检查用户名或密码'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  overflow: hidden;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: #fe2c55;
  top: -100px;
  left: -100px;
  animation: float 10s infinite ease-in-out;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: #25f4ee;
  bottom: -50px;
  right: -50px;
  animation: float 12s infinite ease-in-out reverse;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, 50px); }
}

.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 40px;
  border-radius: 20px;
  color: white;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 32px;
  font-weight: 800;
  margin-bottom: 16px;
  background: linear-gradient(to right, #25f4ee, #fe2c55);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

h2 {
  font-size: 24px;
  margin-bottom: 8px;
}

.subtitle {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.form-group {
  margin-bottom: 20px;
}

.input-wrapper {
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.input-wrapper:focus-within {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(0, 0, 0, 0.4);
}

.icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
}

input {
  width: 100%;
  background: transparent;
  border: none;
  padding: 16px 16px 16px 48px;
  color: white;
  font-size: 15px;
  outline: none;
}

input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.submit-btn {
  width: 100%;
  background: #fe2c55;
  color: white;
  border: none;
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  margin-top: 10px;
}

.submit-btn:hover {
  background: #e02448;
  transform: translateY(-1px);
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-msg {
  color: #ff4c4c;
  font-size: 13px;
  text-align: center;
  margin-top: 16px;
  background: rgba(255, 76, 76, 0.1);
  padding: 8px;
  border-radius: 8px;
}

.card-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

.card-footer a {
  color: #fe2c55;
  font-weight: 600;
  margin-left: 4px;
}

.loader {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
