<template>
  <div class="mobile-tabbar">
    <div 
      class="tab-item" 
      :class="{ active: currentRoute === 'feed' }"
      @click="router.push('/feed')"
    >
      <span class="label">首页</span>
    </div>
    <div 
      class="tab-item" 
      :class="{ active: currentRoute === 'feed' && isFollowingTab }"
      @click="handleFollowingClick"
    >
      <span class="label">关注</span>
    </div>
    <div 
      class="tab-item" 
      :class="{ active: currentRoute === 'editor' }"
      @click="router.push('/editor')"
    >
      <img src="@/assets/icons/publish.png" style="width: 20px; height: 20px;">
    </div>
    <div 
      class="tab-item" 
      :class="{ active: currentRoute === 'messages' }"
      @click="router.push('/messages')"
    >
      <span class="label">消息</span>
    </div>
    <div 
      class="tab-item" 
      :class="{ active: currentRoute === 'profile' }"
      @click="router.push('/profile')"
    >
      <span class="label">我</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const currentRoute = computed(() => {
  if (route.path.startsWith('/feed')) return 'feed'
  if (route.path.startsWith('/profile')) return 'profile'
  if (route.path.startsWith('/editor')) return 'editor'
  if (route.path.startsWith('/messages')) return 'messages'
  return ''
})

const isFollowingTab = computed(() => {
  return route.path.startsWith('/feed') && route.query.tab === 'following'
})

const handleFollowingClick = () => {
  // 跳转到 Feed 页面并切换到关注 tab
  router.push({ path: '/feed', query: { tab: 'following' } })
}
</script>

<style scoped>
.mobile-tabbar {
  display: none; /* 默认隐藏，仅在移动端显示 */
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 50px;
  background-color: var(--bg-secondary);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-item .icon {
  font-size: 20px;
  margin-bottom: 2px;
}

.tab-item.active {
  color: var(--text-primary);
}

.tab-item .highlight {
  background: var(--primary-color);
  width: 36px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-size: 16px;
}

@media (max-width: 768px) {
  .mobile-tabbar {
    display: flex;
  }
}
</style>

