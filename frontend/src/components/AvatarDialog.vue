<template>
  <a-modal
    v-model:visible="isVisible"
    title="更换头像"
    :width="480"
    :footer="false"
    @cancel="handleCancel"
  >
    <div class="avatar-dialog">
      <!-- Current Avatar -->
      <div class="current-avatar-section">
        <div class="section-title">当前头像</div>
        <div class="current-avatar">
          <img v-if="currentAvatar" :src="currentAvatar" alt="Current Avatar" />
          <div v-else class="avatar-placeholder">
            {{ username?.charAt(0).toUpperCase() || 'U' }}
          </div>
        </div>
      </div>

      <!-- Upload New Avatar -->
      <div class="upload-section">
        <div class="section-title">上传新头像</div>
        <a-upload
          :custom-request="handleUpload"
          :show-file-list="false"
          accept="image/png,image/jpeg,image/jpg"
        >
          <template #upload-button>
            <div class="upload-btn">
              <icon-plus />
              <div class="upload-text">点击上传</div>
            </div>
          </template>
        </a-upload>
        <div class="upload-hint">支持 JPG、PNG 格式，文件小于 5MB</div>
      </div>

      <!-- Preview New Avatar -->
      <div v-if="previewAvatar" class="preview-section">
        <div class="section-title">预览</div>
        <div class="preview-avatar">
          <img :src="previewAvatar" alt="Preview Avatar" />
        </div>
      </div>

      <!-- History Avatars -->
      <div v-if="historyAvatars.length > 0" class="history-section">
        <div class="section-title">历史头像</div>
        <div class="history-grid">
          <div
            v-for="(avatar, index) in historyAvatars"
            :key="index"
            class="history-item"
            :class="{ selected: previewAvatar === avatar }"
            @click="selectHistoryAvatar(avatar)"
          >
            <img :src="avatar" alt="History Avatar" />
            <div v-if="previewAvatar === avatar" class="selected-mark">
              <icon-check />
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :disabled="!previewAvatar" @click="handleConfirm">
          确定
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { IconPlus, IconCheck } from '@arco-design/web-vue/es/icon'

interface Props {
  visible: boolean
  currentAvatar?: string
  username?: string
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'confirm'])

const isVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const previewAvatar = ref<string>('')
const historyAvatars = ref<string[]>([])

// Load history avatars from localStorage
const loadHistoryAvatars = () => {
  const stored = localStorage.getItem('avatar_history')
  if (stored) {
    try {
      historyAvatars.value = JSON.parse(stored)
    } catch (e) {
      historyAvatars.value = []
    }
  }
}

// Save avatar to history
const saveToHistory = (avatarUrl: string) => {
  if (!avatarUrl) return

  // Remove duplicates and limit to 5 history items
  const newHistory = [avatarUrl, ...historyAvatars.value.filter(url => url !== avatarUrl)].slice(0, 5)
  historyAvatars.value = newHistory
  localStorage.setItem('avatar_history', JSON.stringify(newHistory))
}

// Handle file upload
const handleUpload = (option: any) => {
  const file = option.fileItem.file
  
  if (!file) return

  // Check file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('头像大小不能超过 5MB')
    return
  }

  // Read file as data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    previewAvatar.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// Select history avatar
const selectHistoryAvatar = (avatar: string) => {
  previewAvatar.value = avatar
}

// Handle confirm
const handleConfirm = () => {
  if (previewAvatar.value) {
    // Save current avatar to history before switching
    if (props.currentAvatar && props.currentAvatar !== previewAvatar.value) {
      saveToHistory(props.currentAvatar)
    }
    
    emit('confirm', previewAvatar.value)
    handleCancel()
  }
}

// Handle cancel
const handleCancel = () => {
  previewAvatar.value = ''
  isVisible.value = false
}

// Watch visible prop to load history
watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadHistoryAvatars()
    previewAvatar.value = ''
  }
})
</script>

<style scoped>
.avatar-dialog {
  padding: 8px 0;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text-primary);
}

/* Current Avatar */
.current-avatar-section {
  margin-bottom: 24px;
}

.current-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.current-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 48px;
  font-weight: bold;
  color: var(--text-tertiary);
}

/* Upload Section */
.upload-section {
  margin-bottom: 24px;
}

.upload-btn {
  width: 120px;
  height: 120px;
  border: 2px dashed var(--border-color);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  margin: 0 auto;
}

.upload-btn:hover {
  border-color: var(--primary-color);
  background: rgba(254, 44, 85, 0.05);
}

.upload-text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.upload-hint {
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

/* Preview Section */
.preview-section {
  margin-bottom: 24px;
}

.preview-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 auto;
  background: var(--bg-secondary);
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* History Section */
.history-section {
  margin-bottom: 24px;
}

.history-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.history-item {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.history-item:hover {
  border-color: var(--primary-color);
}

.history-item.selected {
  border-color: var(--primary-color);
}

.history-item img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.selected-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}
</style>

