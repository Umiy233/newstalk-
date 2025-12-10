<template>
  <div ref="trackerRef" class="message-read-tracker">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { apiClient } from '@/utils/api'

interface Props {
  messageId: string
  isRead: boolean
  currentUserId: string
  receiverId: string
  senderId: string
  // 防抖延迟时间（毫秒）
  debounceDelay?: number
  // Intersection Observer 的阈值
  threshold?: number
  // 消息可见的最小持续时间（毫秒），超过这个时间才标记为已读
  minVisibleDuration?: number
}

const props = withDefaults(defineProps<Props>(), {
  debounceDelay: 500,
  threshold: 0.5, // 消息至少 50% 可见
  minVisibleDuration: 1000, // 消息至少可见 1 秒才标记为已读
})

const emit = defineEmits<{
  read: [messageId: string]
}>()

const trackerRef = ref<HTMLElement | null>(null)
const observer = ref<IntersectionObserver | null>(null)
const isVisible = ref(false)
const visibleStartTime = ref<number | null>(null)
const localReadStatus = ref(props.isRead)
const debounceTimer = ref<NodeJS.Timeout | null>(null)
const readTimer = ref<NodeJS.Timeout | null>(null)
const isMarkingRead = ref(false)

// 防抖函数
const debounce = (fn: () => void, delay: number) => {
  return () => {
    if (debounceTimer.value) {
      clearTimeout(debounceTimer.value)
    }
    debounceTimer.value = setTimeout(fn, delay)
  }
}

// 标记消息为已读
const markAsRead = async () => {
  // 只对接收到的消息（不是自己发送的）进行已读标记
  if (props.senderId === props.currentUserId) {
    return
  }

  // 如果已经标记为已读，或者正在标记中，或者本地状态已经是已读，则跳过
  if (localReadStatus.value || isMarkingRead.value) {
    return
  }

  // 由于对话框打开时已经标记整个对话为已读，这里不再需要时间检查
  // 只要消息可见就立即标记（但通常对话已经标记为已读，所以这里很少会执行）
  isMarkingRead.value = true

  try {
    await apiClient.put(`/messages/${props.messageId}/read`)
    localReadStatus.value = true
    emit('read', props.messageId)
    console.log(`✅ Message ${props.messageId} marked as read`)
  } catch (error) {
    console.error(`❌ Failed to mark message ${props.messageId} as read:`, error)
  } finally {
    isMarkingRead.value = false
  }
}

// 防抖后的标记已读函数
const debouncedMarkAsRead = debounce(markAsRead, props.debounceDelay)

// 处理可见性变化
const handleVisibilityChange = (entries: IntersectionObserverEntry[]) => {
  const entry = entries[0]
  const wasVisible = isVisible.value
  isVisible.value = entry.isIntersecting && entry.intersectionRatio >= props.threshold

  // 如果消息已经标记为已读，不需要再处理
  if (localReadStatus.value) {
    return
  }

  if (isVisible.value && !wasVisible) {
    // 消息刚变为可见，立即标记为已读（不需要等待时间）
    debouncedMarkAsRead()
  }
}

// 初始化 Intersection Observer
const initObserver = () => {
  if (!trackerRef.value || observer.value) return

  observer.value = new IntersectionObserver(handleVisibilityChange, {
    threshold: props.threshold,
    rootMargin: '0px',
  })

  observer.value.observe(trackerRef.value)
}

// 清理 Observer
const cleanupObserver = () => {
  if (observer.value && trackerRef.value) {
    observer.value.unobserve(trackerRef.value)
    observer.value.disconnect()
    observer.value = null
  }
}

// 监听 props.isRead 变化，同步本地状态
watch(() => props.isRead, (newValue) => {
  localReadStatus.value = newValue
})

// 监听 messageId 变化，重新初始化
watch(() => props.messageId, () => {
  cleanupObserver()
  localReadStatus.value = props.isRead
  isVisible.value = false
  visibleStartTime.value = null
  if (readTimer.value) {
    clearTimeout(readTimer.value)
    readTimer.value = null
  }
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
    debounceTimer.value = null
  }
  nextTick(() => {
    initObserver()
  })
})

onMounted(() => {
  nextTick(() => {
    initObserver()
  })
})

onUnmounted(() => {
  cleanupObserver()
  if (readTimer.value) {
    clearTimeout(readTimer.value)
  }
  if (debounceTimer.value) {
    clearTimeout(debounceTimer.value)
  }
})
</script>

<style scoped>
.message-read-tracker {
  width: 100%;
  height: 100%;
}
</style>

