<template>
  <Transition name="modal">
    <div v-if="visible" class="message-modal-overlay" @click.self="handleClose">
      <div class="message-modal">
        <div class="modal-header">
          <div class="header-user-info">
            <div 
              class="user-avatar"
              :style="targetUser?.avatar ? { backgroundImage: `url(${targetUser.avatar})` } : {}"
            >
              <span v-if="!targetUser?.avatar" class="avatar-initial">
                {{ targetUser?.username?.charAt(0).toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="user-details">
              <div class="username">{{ targetUser?.username || '用户' }}</div>
              <div v-if="!isMutualFriend" class="message-limit-hint">
                未互相关注，只能发送一条消息
              </div>
            </div>
          </div>
          <button class="close-btn" @click="handleClose">×</button>
        </div>

        <div class="modal-body">
          <div v-if="isLoading" class="loading-container">
            <div class="spinner"></div>
          </div>
          
          <div v-else class="messages-container" ref="messagesContainer">
            <div v-if="messages.length === 0" class="empty-messages">
              <div class="empty-icon">💬</div>
              <p>还没有消息，开始对话吧~</p>
            </div>
            
            <div v-else class="messages-list">
              <div
                v-for="message in messages"
                :key="message._id"
                class="message-item"
                :class="{ 'message-sent': getSenderId(message) === currentUserId }"
              >
                <div 
                  v-if="getSenderId(message) !== currentUserId"
                  class="message-avatar"
                  :style="getSenderAvatar(message) ? { backgroundImage: `url(${getSenderAvatar(message)})` } : {}"
                >
                  <span v-if="!getSenderAvatar(message)" class="avatar-initial-small">
                    {{ getSenderUsername(message)?.charAt(0).toUpperCase() || 'U' }}
                  </span>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-bubble">
                    {{ message.content }}
                  </div>
                  <div class="message-time">{{ formatDate(message.createdAt) }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div v-if="!isMutualFriend && hasSentMessage" class="limit-warning">
            ⚠️ 未互相关注，你只能发送一条消息
          </div>
          <div class="input-wrapper">
            <textarea
              v-model="messageContent"
              placeholder="输入消息..."
              class="message-input"
              rows="2"
              :disabled="!isMutualFriend && hasSentMessage"
              @keydown.ctrl.enter="sendMessage"
              @keydown.meta.enter="sendMessage"
            ></textarea>
            <button
              class="send-btn"
              :disabled="!messageContent.trim() || isSending || (!isMutualFriend && hasSentMessage)"
              @click="sendMessage"
            >
              {{ isSending ? '发送中...' : '发送' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { io, Socket } from 'socket.io-client'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import { useAuthStore } from '@/stores/auth'

interface MessageUser {
  _id: string
  username: string
  avatar?: string
}

interface Message {
  _id: string
  senderId: MessageUser
  receiverId: MessageUser
  content: string
  isRead: boolean
  createdAt: string
}

interface Props {
  visible: boolean
  targetUserId: string
  targetUser?: {
    _id: string
    username: string
    avatar?: string
  }
  isMutualFriend?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isMutualFriend: false,
})

const emit = defineEmits<{
  close: []
  read: [userId: string]
}>()

const authStore = useAuthStore()
const currentUserId = authStore.currentUser?._id
const socket = ref<Socket | null>(null)
const messages = ref<Message[]>([])
const messageContent = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const hasSentMessage = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)

// 初始化 WebSocket 连接
const initSocket = () => {
  if (!authStore.token || socket.value) return

  // 使用与API相同的base URL
  const wsUrl = (import.meta as any).env?.VITE_WS_URL || 'http://localhost:3000'
  socket.value = io(wsUrl, {
    auth: {
      token: authStore.token,
    },
    transports: ['websocket', 'polling'],
  })

  socket.value.on('connect', () => {
    console.log('WebSocket connected')
  })

  socket.value.on('new_message', (message: Message) => {
    messages.value.push(message)
    scrollToBottom()
  })

  socket.value.on('message_sent', (message: Message) => {
    messages.value.push(message)
    hasSentMessage.value = true
    messageContent.value = ''
    isSending.value = false
    scrollToBottom()
  })

  socket.value.on('message_error', (error: { message: string }) => {
    alert(error.message)
    isSending.value = false
  })

  socket.value.on('disconnect', () => {
    console.log('WebSocket disconnected')
  })
}

// 断开 WebSocket 连接
const disconnectSocket = () => {
  if (socket.value) {
    socket.value.disconnect()
    socket.value = null
  }
}

// 获取对话历史
const fetchConversation = async () => {
  if (!props.targetUserId || !currentUserId) return

  isLoading.value = true
  try {
    const response = await apiClient.get<Message[]>(`/messages/conversation/${props.targetUserId}`)
    if (response.data) {
      messages.value = response.data
      
      // 检查是否已经发送过消息
      hasSentMessage.value = messages.value.some(
        (msg) => getSenderId(msg) === currentUserId
      )
      
      scrollToBottom()
    }
  } catch (error) {
    console.error('Failed to fetch conversation:', error)
  } finally {
    isLoading.value = false
  }
}

// 发送消息
const sendMessage = async () => {
  if (!messageContent.value.trim() || isSending.value) return
  if (!props.isMutualFriend && hasSentMessage.value) return

  isSending.value = true

  try {
    if (socket.value && socket.value.connected) {
      // 使用 WebSocket 发送
      socket.value.emit('send_message', {
        receiverId: props.targetUserId,
        content: messageContent.value.trim(),
      })
    } else {
      // 降级到 HTTP API
      const response = await apiClient.post<Message>('/messages', {
        receiverId: props.targetUserId,
        content: messageContent.value.trim(),
      })
      
      if (response.data) {
        messages.value.push(response.data)
        hasSentMessage.value = true
        messageContent.value = ''
        scrollToBottom()
      }
      isSending.value = false
    }
  } catch (error: any) {
    alert(error.response?.data?.message || '发送失败，请稍后重试')
    isSending.value = false
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// 关闭对话框
const handleClose = () => {
  emit('close')
  messageContent.value = ''
  messages.value = []
  hasSentMessage.value = false
}

// 获取发送者ID（兼容不同的数据结构）
const getSenderId = (message: Message): string => {
  if (typeof message.senderId === 'string') {
    return message.senderId
  }
  return message.senderId?._id || (message.senderId as any)?.id || ''
}

// 获取发送者用户名
const getSenderUsername = (message: Message): string => {
  if (typeof message.senderId === 'string') {
    return '用户'
  }
  return message.senderId?.username || '用户'
}

// 获取发送者头像
const getSenderAvatar = (message: Message): string | undefined => {
  if (typeof message.senderId === 'string') {
    return undefined
  }
  return message.senderId?.avatar
}

// 标记对话为已读
const markConversationAsRead = async () => {
  if (!props.targetUserId || !currentUserId) return

  console.log('🟡 Marking conversation as read for user:', props.targetUserId)

  try {
    await apiClient.put(`/messages/conversation/${props.targetUserId}/read`)
    console.log('✅ Successfully marked as read, emitting read event')
    // 触发父组件更新未读数，传递用户ID
    emit('read', props.targetUserId)
  } catch (error) {
    console.error('❌ Failed to mark conversation as read:', error)
  }
}

// 监听 visible 变化
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    initSocket()
    fetchConversation()
    // 对话框打开时标记为已读
    markConversationAsRead()
  } else {
    disconnectSocket()
  }
})

onMounted(() => {
  if (props.visible) {
    initSocket()
    fetchConversation()
  }
})

onUnmounted(() => {
  disconnectSocket()
})
</script>

<style scoped>
.message-modal-overlay {
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
  padding: 20px;
}

.message-modal {
  width: 70vw;
  height: 70vh;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.header-user-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.avatar-initial {
  font-size: 18px;
  font-weight: bold;
  color: var(--text-tertiary);
}

.user-details {
  flex: 1;
  min-width: 0;
}

.username {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.message-limit-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top-color: var(--primary-color);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--text-tertiary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.message-item.message-sent {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  flex-shrink: 0;
}

.avatar-initial-small {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-tertiary);
}

.message-content-wrapper {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.message-item.message-sent .message-content-wrapper {
  align-items: flex-end;
}

.message-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.message-item.message-sent .message-bubble {
  background: var(--primary-color);
  color: white;
}

.message-time {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 0 4px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.limit-warning {
  font-size: 12px;
  color: #ffa500;
  margin-bottom: 8px;
  padding: 8px;
  background: rgba(255, 165, 0, 0.1);
  border-radius: 4px;
}

.input-wrapper {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-color);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.message-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: #ff1c74;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal Transition */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .message-modal,
.modal-leave-active .message-modal {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .message-modal,
.modal-leave-to .message-modal {
  transform: scale(0.9);
  opacity: 0;
}
</style>

