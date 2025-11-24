<template>
  <button 
    class="follow-btn" 
    :class="{ 
      'following': status === 'following',
      'friend': status === 'friend',
      'loading': isLoading
    }"
    @click.stop="handleFollow"
    :disabled="isLoading"
  >
    <span v-if="isLoading">...</span>
    <span v-else-if="status === 'friend'">互相关注</span>
    <span v-else-if="status === 'following'">已关注</span>
    <span v-else>+ 关注</span>
  </button>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { apiClient } from '@/utils/api'

const props = defineProps<{
  userId: string
  initialStatus?: 'none' | 'following' | 'friend' | 'self'
}>()

const emit = defineEmits<{
  statusChange: [status: 'none' | 'following' | 'friend' | 'self']
}>()

const status = ref<'none' | 'following' | 'friend' | 'self'>(props.initialStatus || 'none')
const isLoading = ref(false)

// Watch for changes in initialStatus prop
watch(() => props.initialStatus, (newStatus) => {
  if (newStatus !== undefined) {
    status.value = newStatus
  }
})

const handleFollow = async () => {
  if (isLoading.value) return
  isLoading.value = true

  try {
    if (status.value === 'none') {
      // Follow
      const response = await apiClient.post(`/social/${props.userId}/follow`)
      if (response.data) {
        status.value = response.data.isFriend ? 'friend' : 'following'
        emit('statusChange', status.value)
      }
    } else {
      // Unfollow
      await apiClient.post(`/social/${props.userId}/unfollow`)
      status.value = 'none'
      emit('statusChange', status.value)
    }
  } catch (error) {
    console.error('Follow action failed', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.follow-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: #fe2c55;
  color: white;
}

.follow-btn:hover {
  background: #e02448;
}

.follow-btn.following {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.follow-btn.following:hover {
  background: rgba(255, 255, 255, 0.15);
}

.follow-btn.friend {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

.follow-btn.loading {
  opacity: 0.7;
  cursor: wait;
}
</style>

