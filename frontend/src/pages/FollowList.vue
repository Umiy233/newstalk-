<template>
  <div class="follow-list-page">
    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.back()">
        <span class="icon">‹</span>
      </button>
      <div class="tabs">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'mutual' }"
          @click="activeTab = 'mutual'"
        >
          互相关注
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'following' }"
          @click="activeTab = 'following'"
        >
          关注
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'followers' }"
          @click="activeTab = 'followers'"
        >
          粉丝
        </div>
      </div>
    </div>

    <!-- List Content -->
    <div class="list-container">
      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="currentList.length === 0" class="empty-state">
        <p>暂无用户</p>
      </div>
      <div v-else class="user-list">
        <div class="list-header" v-if="activeTab === 'followers'">
          我的粉丝 ({{ currentList.length }})
        </div>
        
        <div v-for="user in currentList" :key="user._id" class="user-item" @click="goToProfile(user._id)">
          <div class="avatar-wrapper">
            <img v-if="user.avatar" :src="user.avatar" class="avatar" />
            <div v-else class="avatar placeholder">{{ user.username?.charAt(0).toUpperCase() }}</div>
          </div>
          
          <div class="user-info">
            <div class="name-row">
              <span class="username">{{ user.username }}</span>
            </div>
            <div class="stats-row">
              <span>笔记 {{ user.articleCount || 0 }}</span>
              <span class="separator">|</span>
              <span>粉丝 {{ user.followerCount || 0 }}</span>
            </div>
          </div>

          <div class="action-btn">
            <FollowButton 
              :user-id="user._id"
              :initial-status="user.followStatus"
              @status-change="(status) => handleStatusChange(user, status)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { apiClient } from '@/utils/api'
import { useAuthStore } from '@/stores/auth'
import FollowButton from '@/components/FollowButton.vue'

const router = useRouter()
const route = useRoute()
// const authStore = useAuthStore()

const activeTab = ref(route.query.tab as string || 'following')
const isLoading = ref(false)
const followingList = ref<any[]>([])
const followersList = ref<any[]>([])

const targetUserId = computed(() => route.params.id as string)

const currentList = computed(() => {
  switch (activeTab.value) {
    case 'following':
      return followingList.value
    case 'followers':
      return followersList.value
    case 'mutual':
      // Intersection of following and followers
      // Note: This is a simple client-side implementation. 
      // Ideally backend should provide this or we check 'friend' status
      return followersList.value.filter(follower => 
        followingList.value.some(following => following._id === follower._id)
      )
    default:
      return []
  }
})

const fetchData = async () => {
  if (!targetUserId.value) return
  
  isLoading.value = true
  try {
    const [followingRes, followersRes] = await Promise.all([
      apiClient.get('/social/following', { params: { userId: targetUserId.value } }),
      apiClient.get('/social/followers', { params: { userId: targetUserId.value } })
    ])

    if (followingRes.data) {
      followingList.value = (followingRes.data as any[]).map((u: any) => ({
        ...u,
        followStatus: 'following' // By definition in following list
      }))
    }
    
    if (followersRes.data) {
      // For followers, we need to know if WE follow them (to show 'friend' or 'none'/'following')
      // The API might return this, or we cross reference with followingList if it's our own profile
      // For now assuming API returns populated user objects which might have an isFollowed field or similar
      // If not, we can check against followingList if it's own profile
      
      const myFollowingIds = new Set(followingList.value.map(u => u._id))
      
      followersList.value = (followersRes.data as any[]).map((u: any) => ({
        ...u,
        followStatus: myFollowingIds.has(u._id) ? 'friend' : 'none'
      }))
    }

  } catch (error) {
    console.error('Failed to fetch lists', error)
  } finally {
    isLoading.value = false
  }
}

const handleStatusChange = (user: any, newStatus: string) => {
  user.followStatus = newStatus
  // If we unfollow someone in following list, maybe remove them? 
  // Better to keep them but update status until refresh
}

const goToProfile = (userId: string) => {
  router.push(`/profile/${userId}`)
}

onMounted(() => {
  fetchData()
})

watch(() => activeTab.value, () => {
  // Update URL query without reloading
  router.replace({ query: { ...route.query, tab: activeTab.value } })
})
</script>

<style scoped>
.follow-list-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-primary);
}

.header {
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  background: var(--bg-color);
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  color: white;
  padding: 8px;
  margin-right: 16px;
  cursor: pointer;
}

.icon {
  font-size: 24px;
  font-weight: 300;
}

.tabs {
  display: flex;
  gap: 24px;
  flex: 1;
  justify-content: center;
  margin-right: 40px; /* Balance back button */
}

.tab-item {
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  padding: 10px 0;
}

.tab-item.active {
  color: white;
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background-color: #ff2442; /* Red accent color */
  border-radius: 2px;
}

.list-container {
  padding: 0 16px;
}

.list-header {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 12px 0;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
}

.avatar-wrapper {
  margin-right: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.placeholder {
  background: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
}

.user-info {
  flex: 1;
}

.name-row {
  margin-bottom: 4px;
}

.username {
  font-size: 16px;
  font-weight: 500;
  color: white;
}

.stats-row {
  font-size: 12px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.separator {
  color: var(--text-tertiary);
}

.action-btn {
  margin-left: 12px;
}

.loading, .empty-state {
  padding: 40px;
  text-align: center;
  color: var(--text-secondary);
}
</style>
