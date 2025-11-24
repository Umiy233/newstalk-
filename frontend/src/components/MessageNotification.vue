<template>
  <div class="message-notification" ref="notificationRef">
    <button 
      class="icon-btn notification-btn" 
      @click="toggleDropdown"
    >
      🔔
      <span v-if="unreadCount > 0" class="badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>

    <Transition name="dropdown">
      <div v-if="showDropdown" class="dropdown-menu">
        <div class="dropdown-header">
          <span class="title">消息</span>
          <button class="close-dropdown" @click="closeDropdown">×</button>
        </div>
        
        <div v-if="isLoading" class="loading-messages">
          <div class="spinner-small"></div>
        </div>
        
        <div v-else-if="conversations.length === 0" class="empty-messages">
          <div class="empty-icon">💬</div>
          <p>暂无消息</p>
        </div>
        
        <div v-else class="conversations-list">
          <div
            v-for="conv in conversations"
            :key="conv.userId"
            class="conversation-item"
            :class="{ 'has-unread': conv.unreadCount > 0 }"
            @click="openMessageDialog(conv)"
          >
            <div 
              class="conversation-avatar"
              :style="conv.avatar ? { backgroundImage: `url(${conv.avatar})` } : {}"
            >
              <span v-if="!conv.avatar" class="avatar-initial">
                {{ conv.username?.charAt(0).toUpperCase() || 'U' }}
              </span>
              <span v-if="conv.unreadCount > 0" class="unread-dot"></span>
            </div>
            <div class="conversation-info">
              <div class="conversation-header">
                <span class="conversation-username">{{ conv.username }}</span>
                <span v-if="conv.lastMessage" class="conversation-time">
                  {{ formatDate(conv.lastMessage.createdAt) }}
                </span>
              </div>
              <div class="conversation-preview">
                <span class="preview-text">
                  {{ conv.lastMessage?.content || '暂无消息' }}
                </span>
                <span v-if="conv.unreadCount > 0" class="unread-count">
                  {{ conv.unreadCount }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Message Dialog -->
    <MessageDialog
      v-if="selectedUser"
      :visible="showMessageDialog"
      :target-user-id="selectedUser.userId"
      :target-user="selectedUser"
      :is-mutual-friend="selectedUser.isMutualFriend || false"
      @close="closeMessageDialog"
      @read="handleMessageRead(selectedUser.userId)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { io, Socket } from 'socket.io-client'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import { useAuthStore } from '@/stores/auth'
import MessageDialog from './MessageDialog.vue'

interface ConversationUser {
  _id: string
  userId: string
  username: string
  avatar?: string
  isMutualFriend?: boolean
}

interface Conversation {
  userId: string
  username: string
  avatar?: string
  lastMessage?: {
    _id: string
    content: string
    senderId: { _id: string }
    receiverId: { _id: string }
    createdAt: string
    isRead: boolean
  }
  unreadCount: number
}

const authStore = useAuthStore()
const notificationRef = ref<HTMLElement | null>(null)
const showDropdown = ref(false)
const isLoading = ref(false)
const conversations = ref<Conversation[]>([])
const unreadCount = ref(0)
const socket = ref<Socket | null>(null)
const showMessageDialog = ref(false)
const selectedUser = ref<ConversationUser | null>(null)

// 初始化 WebSocket 连接
const initSocket = () => {
  if (!authStore.token || socket.value || !authStore.isAuthenticated) return

  const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000'
  socket.value = io(wsUrl, {
    auth: {
      token: authStore.token,
    },
    transports: ['websocket', 'polling'],
  })

  socket.value.on('connect', () => {
    console.log('Notification WebSocket connected')
  })

  socket.value.on('new_message', () => {
    // 收到新消息，刷新列表
    fetchConversations()
    fetchUnreadCount()
  })

  socket.value.on('disconnect', () => {
    console.log('Notification WebSocket disconnected')
  })
}

// 断开 WebSocket 连接
const disconnectSocket = () => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
}

// 获取对话列表
const fetchConversations = async () => {
  if (!authStore.isAuthenticated) return

  isLoading.value = true
  try {
    const response = await apiClient.get('/messages/conversations', {
      params: { limit: 20 }
    })

    console.log('Conversations API response:', response)

    if (response.data && Array.isArray(response.data)) {
      // 直接是数组的情况
      conversations.value = response.data
      console.log('Using direct array:', conversations.value)
    } else if (response.data && (response.data as any).data && Array.isArray((response.data as any).data)) {
      // 嵌套在 data 字段的情况
      conversations.value = (response.data as any).data
      console.log('Using nested data:', conversations.value)
    } else {
      conversations.value = []
      console.log('No valid data found, setting empty array')
    }

    console.log('Final conversations:', conversations.value)
    console.log('Conversations length:', conversations.value.length)
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    conversations.value = []
  } finally {
    isLoading.value = false
  }
}

// 获取未读消息数
const fetchUnreadCount = async () => {
  if (!authStore.isAuthenticated) return

  try {
    const response = await apiClient.get('/messages/unread-count')
    if (response.data && typeof response.data === 'object' && 'count' in response.data) {
      unreadCount.value = (response.data as any).count || 0
    } else if (response.data && typeof response.data === 'number') {
      unreadCount.value = response.data
    } else {
      unreadCount.value = 0
    }
  } catch (error) {
    console.error('Failed to fetch unread count:', error)
    unreadCount.value = 0
  }
}

// 切换下拉框
const toggleDropdown = () => {
  if (!authStore.isAuthenticated) {
    return
  }
  
  if (showDropdown.value) {
    closeDropdown()
  } else {
    showDropdown.value = true
    fetchConversations()
    fetchUnreadCount()
  }
}

// 关闭下拉框
const closeDropdown = () => {
  showDropdown.value = false
}

// 打开消息对话框
const openMessageDialog = async (conv: Conversation) => {
  if (!conv.userId) {
    console.error('Invalid conversation: missing userId')
    return
  }

  // 获取用户详细信息，包括互相关注状态
  try {
    const response = await apiClient.get(`/auth/users/${conv.userId}`)
    if (response.data) {
      // 处理可能的嵌套数据结构
      const userData = (response.data as any).data || response.data
      selectedUser.value = {
        _id: conv.userId,
        userId: conv.userId,
        username: conv.username || userData.username || '未知用户',
        avatar: conv.avatar || userData.avatar,
        isMutualFriend: userData.followStatus === 'friend' || false,
      }

      showMessageDialog.value = true
      closeDropdown()
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    // 如果获取用户信息失败，仍然打开对话框，使用对话中的信息
    selectedUser.value = {
      _id: conv.userId,
      userId: conv.userId,
      username: conv.username || '未知用户',
      avatar: conv.avatar,
      isMutualFriend: false,
    }
    showMessageDialog.value = true
    closeDropdown()
  }
}

// 处理消息已读事件
const handleMessageRead = async (userId: string) => {
  console.log('🔵 Handling message read for user:', userId)
  console.log('🔵 Current conversations:', conversations.value.map(c => ({ userId: c.userId, unreadCount: c.unreadCount })))
  console.log('🔵 Current total unread count:', unreadCount.value)

  // 立即更新本地未读数
  const convIndex = conversations.value.findIndex(conv => conv.userId === userId)
  if (convIndex >= 0) {
    console.log('✅ Found conversation at index:', convIndex, 'unread count before:', conversations.value[convIndex].unreadCount)
    conversations.value[convIndex].unreadCount = 0
    // 重新计算总未读数
    const newUnreadCount = conversations.value.reduce((total, conv) => total + conv.unreadCount, 0)
    console.log('✅ New total unread count:', newUnreadCount)
    unreadCount.value = newUnreadCount
  } else {
    console.log('❌ Conversation not found for userId:', userId)
  }

  // 异步刷新数据以确保与服务器同步
  setTimeout(() => {
    console.log('🔄 Refreshing data after mark as read')
    fetchConversations()
    fetchUnreadCount()
  }, 500)
}

// 关闭消息对话框
const closeMessageDialog = () => {
  showMessageDialog.value = false
  selectedUser.value = null
  // 刷新对话列表
  fetchConversations()
  fetchUnreadCount()
}

// 点击外部关闭下拉框
const handleClickOutside = (event: MouseEvent) => {
  if (notificationRef.value && !notificationRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

// 监听认证状态
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    initSocket()
    fetchUnreadCount()
  } else {
    disconnectSocket()
    conversations.value = []
    unreadCount.value = 0
  }
})

let refreshInterval: NodeJS.Timeout | null = null

onMounted(() => {
  if (authStore.isAuthenticated) {
    initSocket()
    fetchUnreadCount()
  }
  
  // 定期刷新未读消息数
  refreshInterval = setInterval(() => {
    if (authStore.isAuthenticated) {
      fetchUnreadCount()
    }
  }, 30000) // 每30秒刷新一次

  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  disconnectSocket()
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.message-notification {
  position: relative;
}

.notification-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: -2px;
  right: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  background: var(--primary-color);
  color: white;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--bg-color);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 360px;
  max-height: 500px;
  background: var(--bg-secondary);
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.close-dropdown {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.close-dropdown:hover {
  background: rgba(255, 255, 255, 0.1);
}

.loading-messages,
.empty-messages {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
  display: block;
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
}

.conversation-item {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.conversation-item.has-unread {
  background: rgba(254, 44, 85, 0.05);
}

.conversation-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
  flex-shrink: 0;
}

.avatar-initial {
  font-size: 20px;
  font-weight: bold;
  color: var(--text-tertiary);
}

.unread-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: var(--primary-color);
  border-radius: 50%;
  border: 2px solid var(--bg-secondary);
}

.conversation-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-username {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.conversation-time {
  font-size: 12px;
  color: var(--text-tertiary);
  white-space: nowrap;
}

.conversation-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.preview-text {
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.unread-count {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: var(--primary-color);
  color: white;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* Dropdown Transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

