<template>
  <div class="profile-page">
    <!-- Navigation -->
    <nav class="nav-bar">
      <div class="nav-left" @click="router.push('/feed')">
        <span class="back-icon">←</span>
        <span class="logo">News</span>
      </div>
      <div class="nav-right">
        <MessageNotification />
        <button class="icon-btn" @click="openSettings">⋯</button>
      </div>
    </nav>

    <!-- Header Profile Info -->
    <header class="profile-header">
      <div class="profile-cover"></div>
      <div class="profile-info-container">
        <div class="avatar-wrapper">
          <div 
            class="avatar" 
            :class="{ 'avatar-clickable': isOwnProfile }"
            :style="user?.avatar ? { backgroundImage: `url(${user.avatar})` } : {}"
            @click="isOwnProfile && openAvatarDialog()"
          >
            <span v-if="!user?.avatar" class="avatar-initial">{{ user?.username?.charAt(0).toUpperCase() }}</span>
            <div v-if="isOwnProfile" class="avatar-edit-overlay">
              <span class="edit-icon">📷</span>
            </div>
          </div>
        </div>
        
        <div class="info-content">
          <h1 class="username">{{ user?.username }}</h1>
          <p class="user-id">ID: {{ user?._id?.slice(-6) || 'Unknown' }}</p>
          
          <div class="stats-row">
            <div class="stat-item" @click="openFollowingList">
              <span class="count">{{ followingCount }}</span>
              <span class="label">关注</span>
            </div>
            <div class="stat-item" @click="openFollowerList">
              <span class="count">{{ followerCount }}</span>
              <span class="label">粉丝</span>
            </div>
            <div class="stat-item">
              <span class="count">0</span>
              <span class="label">获赞</span>
            </div>
          </div>

          <p class="bio">{{ user?.bio || '这个人很懒，什么都没有写...' }}</p>

          <!-- Follow relationship hint -->
          <div v-if="!isOwnProfile && (followStatus === 'friend' || isFollowedBy)" class="follow-hint">
            <span v-if="followStatus === 'friend'">你们是朋友</span>
            <span v-else-if="isFollowedBy && followStatus !== 'following'">对方关注了你</span>
          </div>

          <div class="action-buttons">
            <template v-if="isOwnProfile">
              <button class="edit-btn" @click="openEditProfile">编辑资料</button>
              <!-- <button class="settings-btn" @click="openSettings">⚙️ 设置</button> -->
            </template>
            <template v-else-if="user">
              <FollowButton 
                :user-id="user._id"
                :initial-status="followStatus"
                class="profile-follow-btn"
                @status-change="handleFollowStatusChange"
              />
              <button class="message-btn" @click="openMessageDialog">私信</button>
            </template>
          </div>
        </div>
      </div>
    </header>

    <!-- Content Tabs -->
    <div class="content-tabs">
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'works' }"
        @click="activeTab = 'works'"
      >
        作品
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'likes' }"
        @click="activeTab = 'likes'"
      >
        喜欢
      </div>
      <div 
        class="tab-item" 
        :class="{ active: activeTab === 'private' }"
        @click="activeTab = 'private'"
      >
        私密
      </div>
    </div>

    <!-- Content Grid -->
    <div class="content-grid" v-if="activeTab === 'works'">
      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="articles.length === 0" class="empty-state">
        <div class="empty-icon">📹</div>
        <p>还没有发布过作品</p>
        <button v-if="isOwnProfile" class="upload-btn" @click="router.push('/editor')">去发布</button>
      </div>
      <div v-else class="grid-layout">
        <div 
          v-for="item in articles" 
          :key="item.id" 
          class="grid-item"
          @click="goToArticle(item.id)"
        >
          <div class="cover-wrapper">
            <img v-if="item.lastImageUrl" :src="item.lastImageUrl" class="cover-img" />
            <div v-else class="no-cover">{{ item.title.charAt(0) }}</div>
            <div class="item-stats">
              <span>👁️ {{ item.viewCount }}</span>
            </div>
            <div 
              class="heart-button"
              :class="{ liked: item.isLiked, animating: item.animating }"
              @click.stop="toggleLike(item)"
            >
              <span class="heart-icon" @click.stop="toggleLike(item)">{{ item.isLiked ? '❤️' : '🤍' }}</span>
            </div>
          </div>
          <div class="item-title">{{ item.title }}</div>
        </div>
      </div>
    </div>

    <!-- Liked Content Grid -->
    <div class="content-grid" v-if="activeTab === 'likes'">
      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="likedArticles.length === 0" class="empty-state">
        <div class="empty-icon">❤️</div>
        <p>还没有喜欢的作品</p>
      </div>
      <div v-else class="grid-layout">
        <div 
          v-for="item in likedArticles" 
          :key="item.id" 
          class="grid-item"
          @click="goToArticle(item.id)"
        >
          <div class="cover-wrapper">
            <img v-if="item.lastImageUrl" :src="item.lastImageUrl" class="cover-img" />
            <div v-else class="no-cover">{{ item.title.charAt(0) }}</div>
            <div class="item-stats">
              <span>👁️ {{ item.viewCount }}</span>
            </div>
            <div 
              class="heart-button"
              :class="{ liked: item.isLiked, animating: item.animating }"
              @click.stop="toggleLike(item)"
            >
              <span class="heart-icon" @click.stop="toggleLike(item)">{{ item.isLiked ? '❤️' : '🤍' }}</span>
            </div>
          </div>
          <div class="item-title">{{ item.title }}</div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div v-if="showSettings" class="settings-modal-overlay" @click.self="showSettings = false">
      <div class="settings-modal">
        <div class="modal-header">
          <h3>设置</h3>
          <button class="close-btn" @click="showSettings = false">×</button>
        </div>
        <div class="modal-body">
          <div class="setting-group">
            <label>账号管理</label>
            <div class="setting-item" @click="openEditProfile">
              <span>个人资料</span>
              <span class="arrow">›</span>
            </div>
            <div class="setting-item">
              <span>账号安全</span>
              <span class="arrow">›</span>
            </div>
          </div>
          
          <div class="setting-group">
            <label>通用</label>
            <div class="setting-item">
              <span>深色模式</span>
              <div class="switch active"></div>
            </div>
          </div>

          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </div>

    <!-- Edit Profile Modal -->
    <div v-if="showEditProfile" class="settings-modal-overlay" @click.self="showEditProfile = false">
      <div class="settings-modal">
        <div class="modal-header">
          <h3>编辑资料</h3>
          <button class="close-btn" @click="showEditProfile = false">×</button>
        </div>
          <div class="modal-body">
             <form @submit.prevent="handleUpdateProfile">
              <div class="form-group">
                <label>头像 URL</label>
                <input v-model="editForm.avatar" type="text" placeholder="头像图片链接" class="dark-input" />
              </div>
              <div class="form-group">
                <label>用户名</label>
                <input v-model="editForm.username" type="text" placeholder="用户名" class="dark-input" required />
              </div>
            <div class="form-group">
              <label>简介</label>
              <textarea v-model="editForm.bio" placeholder="介绍一下自己..." class="dark-input bio-input"></textarea>
            </div>
            <button type="submit" class="save-btn" :disabled="isSaving">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
           </form>
        </div>
      </div>
    </div>

    <!-- Avatar Dialog -->
    <AvatarDialog
      v-model:visible="showAvatarDialog"
      :current-avatar="user?.avatar"
      :username="user?.username"
      @confirm="handleAvatarChange"
    />

    <!-- Message Dialog -->
    <MessageDialog
      v-if="user"
      :visible="showMessageDialog"
      :target-user-id="user._id"
      :target-user="user"
      :is-mutual-friend="followStatus === 'friend'"
      @close="showMessageDialog = false"
    />

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiClient } from '@/utils/api'
import type { FeedItem } from '@/types/models'
import FollowButton from '@/components/FollowButton.vue'
import AvatarDialog from '@/components/AvatarDialog.vue'
import MessageDialog from '@/components/MessageDialog.vue'
import MessageNotification from '@/components/MessageNotification.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// Reactive state variables must be declared BEFORE they are used in functions
const activeTab = ref('works')
const showSettings = ref(false)
const showEditProfile = ref(false)
const showAvatarDialog = ref(false)
const showMessageDialog = ref(false)
const articles = ref<FeedItem[]>([])
const likedArticles = ref<FeedItem[]>([])
const isLoading = ref(false)
const isSaving = ref(false)
const followingCount = ref(0)
const followerCount = ref(0)

const editForm = ref({
  username: '',
  bio: '',
  avatar: ''
})

const user = ref<any>(null)
const followStatus = ref<'none' | 'following' | 'friend' | 'self'>('none')
const isFollowedBy = ref(false)

const routeUserId = computed(() => route.params.id as string)
const isOwnProfile = computed(() => {
  return !routeUserId.value || routeUserId.value === authStore.currentUser?._id
})

// Functions definition
const fetchUserProfile = async () => {
  if (isOwnProfile.value) {
    user.value = authStore.currentUser
    followStatus.value = 'self'
  } else {
    try {
      const res = await apiClient.get(`/auth/users/${routeUserId.value}`)
      if (res.data) {
        user.value = res.data
        followStatus.value = (res.data as any).followStatus || 'none'
        isFollowedBy.value = (res.data as any).isFollowedBy || false
      }
    } catch (e) {
      console.error('Failed to fetch user profile', e)
      user.value = null
      followStatus.value = 'none'
    }
  }
  
  // After user is loaded, fetch articles and stats
  if (user.value) {
    await Promise.all([
      fetchUserArticles(),
      fetchLikedArticles(),
      fetchFollowStats()
    ])
  }
}

const fetchUserArticles = async () => {
  if (!user.value?._id) return
  
  isLoading.value = true
  try {
    const response = await apiClient.get('/feed', {
      params: { 
        authorId: user.value._id,
        limit: 20 
      } 
    })
    
    if (response.data) {
       const feedData = response.data as any
       const allItems = feedData.items || []
       
       articles.value = allItems.map((item: any) => ({
        id: item._id,
        title: item.title,
        summary: item.summary,
        lastImageUrl: item.images?.[0]?.url,
        author: {
          id: item.authorId._id,
          username: item.authorId.username,
          avatar: item.authorId.avatar
        },
        viewCount: item.viewCount,
        createdAt: item.createdAt,
        isLiked: item.isLiked || false,
        animating: false
      }))
    }
  } catch (error) {
    console.error('Failed to fetch user articles', error)
  } finally {
    isLoading.value = false
  }
}

const handleAvatarChange = async (avatarUrl: string) => {
  try {
    // 更新用户头像到服务器
    const response = await apiClient.put('/auth/profile', {
      avatar: avatarUrl
    })

    if (response.data) {
      // 更新本地用户信息
      const updatedUser = response.data as any
      authStore.updateUser(updatedUser)
      
      // 强制更新本地用户显示
      user.value = { ...updatedUser }
      
      // 更新编辑表单
      editForm.value.avatar = avatarUrl
    }
  } catch (error: any) {
    console.error('Avatar update error:', error)
    alert(error.response?.data?.message || '头像更新失败，请稍后重试')
  }
}

const openAvatarDialog = () => {
  showAvatarDialog.value = true
}



const fetchLikedArticles = async () => {
  if (!user.value?._id) return

  isLoading.value = true
  try {
    const response = await apiClient.get('/feed', {
      params: { 
        type: 'liked',
        likedUserId: user.value._id,
        limit: 20 
      } 
    })
    
    if (response.data) {
      const feedData = response.data as any
      likedArticles.value = (feedData.items || []).map((item: any) => ({
        id: item._id,
        title: item.title,
        summary: item.summary,
        lastImageUrl: item.images?.[0]?.url,
        author: {
          id: item.authorId._id,
          username: item.authorId.username,
          avatar: item.authorId.avatar
        },
        viewCount: item.viewCount,
        createdAt: item.createdAt,
        isLiked: item.isLiked !== undefined ? item.isLiked : true, // Liked articles are always liked
        animating: false
      }))
    }
  } catch (error) {
    console.error('Failed to fetch liked articles', error)
  } finally {
    isLoading.value = false
  }
}

const toggleLike = async (item: FeedItem & { isLiked?: boolean; animating?: boolean }) => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }

  // Prevent double click
  if (item.animating) return

  const wasLiked = item.isLiked || false
  const newLikedState = !wasLiked

  // Optimistic update
  item.isLiked = newLikedState
  item.animating = true

  try {
    if (newLikedState) {
      await apiClient.post(`/likes/${item.id}`)
    } else {
      await apiClient.delete(`/likes/${item.id}`)
      
      // If in liked tab, remove from list
      if (activeTab.value === 'likes') {
        likedArticles.value = likedArticles.value.filter(a => a.id !== item.id)
      }
    }

    // Remove animation class after animation completes
    setTimeout(() => {
      item.animating = false
    }, 600)
  } catch (error) {
    // Revert on error
    item.isLiked = wasLiked
    item.animating = false
    console.error('Like error:', error)
  }
}

const fetchFollowStats = async () => {
  if (!user.value?._id) return
  
  try {
    const [followingRes, followersRes] = await Promise.all([
      apiClient.get('/social/following', {
        params: { userId: user.value._id }
      }),
      apiClient.get('/social/followers', {
        params: { userId: user.value._id }
      })
    ])
    
    if (followingRes.data) followingCount.value = (followingRes.data as any[]).length
    if (followersRes.data) followerCount.value = (followersRes.data as any[]).length
  } catch (error) {
    console.error('Failed to fetch social stats', error)
  }
}

const handleFollowStatusChange = (newStatus: 'none' | 'following' | 'friend' | 'self') => {
  followStatus.value = newStatus
  // If status becomes 'friend', update isFollowedBy
  if (newStatus === 'friend') {
    isFollowedBy.value = true
  } else if (newStatus === 'none') {
    // When unfollowing, check if still followed by them
    // We'll need to refresh the user data to get updated isFollowedBy
    if (!isOwnProfile.value && user.value?._id) {
      fetchUserProfile()
    }
  }
}

// Lifecycle hooks and watchers must come AFTER functions they use are defined
onMounted(() => {
  fetchUserProfile()
})

watch(() => route.params.id, () => {
  fetchUserProfile()
}, { immediate: true })

watch(() => activeTab.value, (newTab) => {
  if (newTab === 'likes') {
    fetchLikedArticles()
  } else if (newTab === 'works') {
    fetchUserArticles()
  }
})

const goToArticle = (id: string) => {
  router.push(`/article/${id}`)
}

const openSettings = () => {
  showSettings.value = true
}

const openEditProfile = () => {
  editForm.value = {
    username: user.value?.username || '',
    bio: user.value?.bio || '',
    avatar: user.value?.avatar || ''
  }
  showEditProfile.value = true
  showSettings.value = false
}

const handleUpdateProfile = async () => {
  isSaving.value = true
  try {
    const response = await apiClient.put('/auth/profile', editForm.value)
    if (response.data) {
      authStore.updateUser(response.data as any)
      showEditProfile.value = false
    }
  } catch (error) {
    console.error('Failed to update profile', error)
    alert('更新失败，请稍后重试')
  } finally {
    isSaving.value = false
  }
  fetchUserProfile()
}

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

const openFollowingList = () => {
  console.log('Open following list')
}

const openFollowerList = () => {
  console.log('Open follower list')
}

const openMessageDialog = () => {
  if (!authStore.isAuthenticated) {
    router.push('/login')
    return
  }
  showMessageDialog.value = true
}
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-primary);
  padding-bottom: 40px;
}

/* Nav */
.nav-bar {
  height: 60px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(22, 24, 35, 0.8);
  backdrop-filter: blur(10px);
}

.nav-left {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 10px;
}

.back-icon {
  font-size: 20px;
}

.logo {
  font-weight: 800;
  font-size: 18px;
}

.icon-btn {
  font-size: 20px;
  color: white;
  margin-left: 16px;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Profile Header */
.profile-header {
  position: relative;
  margin-bottom: 20px;
}

.profile-cover {
  height: 160px;
  background: linear-gradient(to right, #2b32b2, #1488cc);
  opacity: 0.5;
}

.profile-info-container {
  padding: 0 24px;
  transform: translateY(-40px);
}

.avatar-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  padding: 4px;
  background: var(--bg-color);
  display: inline-block;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #333;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: bold;
  color: white;
  position: relative;
}

.avatar-clickable {
  cursor: pointer;
  transition: opacity 0.2s;
}

.avatar-clickable:hover {
  opacity: 0.9;
}

.avatar-clickable:hover .avatar-edit-overlay {
  opacity: 1;
}

.avatar-edit-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.edit-icon {
  font-size: 32px;
}

.info-content {
  margin-top: 12px;
}

.username {
  font-size: 24px;
  margin-bottom: 4px;
}

.user-id {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-bottom: 16px;
}

.stats-row {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  cursor: pointer;
}

.count {
  font-size: 16px;
  font-weight: 700;
}

.label {
  font-size: 14px;
  color: var(--text-secondary);
}

.bio {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.4;
  max-width: 600px;
}

.follow-hint {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.edit-btn, .settings-btn, .message-btn {
  background: rgba(255, 255, 255, 0.08);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 24px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s;
}

.profile-follow-btn {
  padding: 8px 32px;
  font-size: 14px;
}

.edit-btn:hover, .settings-btn:hover, .message-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* Tabs */
.content-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  gap: 32px;
}

.tab-item {
  padding: 14px 0;
  font-size: 16px;
  color: var(--text-secondary);
  cursor: pointer;
  position: relative;
  font-weight: 500;
}

.tab-item.active {
  color: white;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--primary-color);
}

/* Grid */
.content-grid {
  padding: 20px 24px;
  min-height: 300px;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.grid-item {
  cursor: pointer;
}

.cover-wrapper {
  width: 100%;
  padding-bottom: 133%;
  position: relative;
  background: var(--bg-secondary);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}

.cover-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.grid-item:hover .cover-img {
  transform: scale(1.05);
}

.no-cover {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: var(--text-tertiary);
}

.item-stats {
  position: absolute;
  bottom: 6px;
  left: 8px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  display: flex;
  align-items: center;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.heart-button {
  position: absolute;
  bottom: 6px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 10;
}

.heart-button:hover {
  transform: scale(1.1);
}

.heart-icon {
  font-size: 16px;
  display: block;
  transition: transform 0.3s ease;
}

.heart-button.animating .heart-icon {
  animation: heartBounce 0.6s ease;
}

@keyframes heartBounce {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(1.3);
  }
  50% {
    transform: scale(0.9);
  }
  75% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}

.item-title {
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--text-secondary);
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 60px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.upload-btn {
  margin-top: 20px;
  background: var(--primary-color);
  color: white;
  padding: 10px 32px;
  border-radius: 4px;
  font-weight: 600;
}

/* Settings Modal */
.settings-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.settings-modal {
  width: 400px;
  background: #252632;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.close-btn {
  font-size: 24px;
  color: var(--text-secondary);
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.setting-group {
  margin-bottom: 24px;
}

.setting-group label {
  font-size: 12px;
  color: var(--text-tertiary);
  display: block;
  margin-bottom: 8px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  cursor: pointer;
  font-size: 15px;
}

.setting-item:hover span {
  color: white;
}

.arrow {
  color: var(--text-tertiary);
}

.logout-btn {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.08);
  color: #ff4c4c;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 10px;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.12);
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
}

/* Form Styles */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.dark-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  color: white;
  font-size: 14px;
  transition: border-color 0.2s;
}

.dark-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.bio-input {
  height: 100px;
  resize: none;
}

.save-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary-color);
  color: white;
  border-radius: 8px;
  font-weight: 600;
  margin-top: 10px;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
