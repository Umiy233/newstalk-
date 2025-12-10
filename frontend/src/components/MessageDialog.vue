<template>
  <Transition name="slide-right">
    <div v-if="visible" class="message-page">
      <div class="page-header">
        <button class="back-btn" @click="handleClose">
          <span class="icon">‹</span>
        </button>
        <div class="header-title">
          <span class="username">{{ targetUser?.username || '用户' }}</span>
          <div v-if="!isMutualFriend" class="limit-tag">陌生人</div>
        </div>
      </div>

      <div class="page-content" ref="messagesContainer">
        <div v-if="isLoading" class="loading-container">
          <div class="spinner"></div>
        </div>
        
        <div v-else class="messages-list">
          
          <div
            v-for="message in messages"
            :key="message._id"
            class="message-row"
            :class="{ 'message-sent': getSenderId(message) === currentUserId }"
          >
            <div v-if="shouldShowTime(message)" class="time-stamp">
              {{ formatDate(message.createdAt) }}
            </div>
            
            <div class="message-bubble-group">
              <div 
                v-if="getSenderId(message) !== currentUserId"
                class="avatar"
                :style="getSenderAvatar(message) ? { backgroundImage: `url(${getSenderAvatar(message)})` } : {}"
                @click="handleClick(message)"
              >
                <span v-if="!getSenderAvatar(message)" class="avatar-text">
                  {{ getSenderUsername(message)?.charAt(0).toUpperCase() }}
                  
                </span>
              </div>
              
              <div class="bubble">
                {{ message.content }}
              </div>
              
              <div 
                v-if="getSenderId(message) === currentUserId"
                class="avatar"
                :style="authStore.currentUser?.avatar ? { backgroundImage: `url(${authStore.currentUser.avatar})` } : {}"
              >
                <span v-if="!authStore.currentUser?.avatar" class="avatar-text">
                  {{ authStore.currentUser?.username?.charAt(0).toUpperCase() }}
                </span>
                
              </div>
            </div>
          </div>
        </div>
        <div v-if="!isMutualFriend && hasSentMessage" class="limit-tip">
          需对方回复后才能继续发送
        </div>
      </div>

      <div class="page-footer">
        
        <div class="input-bar">
         
          <div class="input-box-wrapper">
            <input
              ref="messageInputRef"
              v-model="messageContent"
              placeholder="发消息..."
              class="chat-input"
              :disabled="!isMutualFriend && hasSentMessage"
              @keydown.enter="sendMessage"
            />
          </div>
          <button class="icon-btn emoji-btn" @click="showEmojiPicker = !showEmojiPicker">😊</button>
          
          <button 
             
            class="send-btn-small"
            :disabled="isSending"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
        <div v-if="showEmojiPicker" class="emoji-picker-wrapper">
          <EmojiPicker 
            @select="handleEmojiSelect" 
            :native="true" 
            :disable-skin-tones="true"
            :hide-search="true"
            :hide-group-icons="false"
            :static-texts="{ placeholder: '搜索表情' }"
            class="custom-emoji-picker"
          />
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
import { useRouter } from 'vue-router'
import EmojiPicker from 'vue3-emoji-picker'
import 'vue3-emoji-picker/css'

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
const router = useRouter()
const socket = ref<Socket | null>(null)
const messages = ref<Message[]>([])
const messageContent = ref('')
const isLoading = ref(false)
const isSending = ref(false)
const hasSentMessage = ref(false)
const messagesContainer = ref<HTMLElement | null>(null)
const messageInputRef = ref<HTMLInputElement | null>(null)
const showEmojiPicker = ref(false)

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
      
      // 标记所有接收到的消息为已读（本地状态更新）
      // 因为已经在打开对话框时调用了 markConversationAsRead，这里同步本地状态
      messages.value.forEach((msg) => {
        if (getSenderId(msg) !== currentUserId) {
          msg.isRead = true
        }
      })
    }
  } catch (error) {
    console.error('Failed to fetch conversation:', error)
  } finally {
    isLoading.value = false
    nextTick(() => {
      scrollToBottom()
    })
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

//表情处理


//表情处理
const handleEmojiSelect = (emoji: any) => {
  const input = messageInputRef.value
  const emojiText = emoji.i || emoji
  
  if (input) {
    const start = input.selectionStart || 0
    const end = input.selectionEnd || 0
    messageContent.value = messageContent.value.substring(0, start) + emojiText + messageContent.value.substring(end)
    
    // Move cursor after the inserted emoji
    nextTick(() => {
      input.focus()
      const newPosition = start + emojiText.length
      input.setSelectionRange(newPosition, newPosition)
    })
  } else {
    messageContent.value += emojiText
  }
  
  showEmojiPicker.value = false
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

  try {
    // 立即调用API标记为已读，不等待
    await apiClient.put(`/messages/conversation/${props.targetUserId}/read`)
    // 触发父组件更新未读数，传递用户ID
    emit('read', props.targetUserId)
  } catch (error) {
    console.error('❌ Failed to mark conversation as read:', error)
  }
}

//点击对方头像跳转到对方主页
const handleClick =(message:Message)=>{
   const senderId = getSenderId(message)
   if(senderId){
    router.push(`/profile/${senderId}`)
   }
}

// 监听 visible 变化
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    // 立即标记为已读，不等待消息加载
    await markConversationAsRead()
    initSocket()
    fetchConversation()
  } else {
    disconnectSocket()
  }
})

// 是否显示时间戳（两条消息间隔超过5分钟）
const shouldShowTime = (message: Message) => {
  const index = messages.value.findIndex(m => m._id === message._id)
  if (index === 0) return true
  const prevMessage = messages.value[index - 1]
  const timeDiff = new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime()
  return timeDiff > 5 * 60 * 1000
}

onMounted(async () => {
  if (props.visible) {
    // 立即标记为已读，不等待消息加载
    await markConversationAsRead()
    initSocket()
    fetchConversation()
  }
})

onUnmounted(() => {
  disconnectSocket()
})
</script>

<style scoped>
.message-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--bg-color);
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.page-header {
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg-color);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
  position: relative;
}

.back-btn, .more-btn {
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.username {
  font-size: 16px;
  font-weight: 600;
}

.limit-tag {
  font-size: 10px;
  background: var(--hover-color);
  padding: 1px 6px;
  border-radius: 4px;
  margin-top: 2px;
  color: var(--text-tertiary);
}

.page-content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-secondary);
  padding: 16px 12px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.message-sent {
  align-items: flex-end;
}

.time-stamp {
  align-self: center;
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.message-bubble-group {
  display: flex;
  gap: 8px;
  max-width: 80%;
}

/* .message-sent .message-bubble-group {
  flex-direction: row-reverse;
} */

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  background-size: cover;
  background-position: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
}

.bubble {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.5;
  background: light-dark(rgba(0, 0, 0, 0.05), #2c2c2e);
  color: var(--text-primary);
  position: relative;
  word-wrap: break-word;
}

.message-sent .bubble {
  background: var(--primary-color);
  color: white;
}

.page-footer {
  background: var(--bg-color);
  padding: 8px 12px;
  padding-bottom: max(8px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border-color);
}

.input-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.input-box-wrapper {
  flex: 1;
  background: var(--bg-secondary);
  border-radius: 20px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

.chat-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 15px;
  padding: 0;
  outline: none;
}

.chat-input::placeholder {
  color: var(--text-tertiary);
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.icon-btn:hover {
  background: var(--hover-color);
}

.send-btn-small {
  padding: 6px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  transition: opacity 0.2s;
}

.send-btn-small:hover {
  opacity: 0.9;
}

/* Slide Transition */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
  transform: translateX(100%);
}

.limit-tip {
  text-align: center;
  color: var(--text-tertiary);
  margin-bottom: 12px;
}

.emoji-picker-wrapper {
  width: 100%;
  height: 300px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-color);
}

:deep(.v3-emoji-picker) {
  width: 100% !important;
  height: 100% !important;
  background: var(--bg-color) !important;
  border: none !important;
  border-radius: 0 !important;
  --ep-color-bg: var(--bg-color) !important;
  --ep-color-text: var(--text-primary) !important;
  --ep-color-border: var(--border-color) !important;
  --ep-color-hover: var(--hover-color) !important;
  --ep-color-active: var(--hover-color) !important;
  --ep-color-sbar: var(--border-color) !important;
}

:deep(.v3-header .v3-group) {
  filter: invert(1) brightness(2);
}

:deep(.v3-sticky) {
  display: none !important;
}

:deep(.v3-footer) {
  display: none !important;
}
</style>

