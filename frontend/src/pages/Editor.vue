<template>
  <div class="editor-container">
    <header class="editor-header">
      <div class="header-left">
        <button @click="handleBack" class="back-btn">
          <span class="icon">✕</span>
        </button>
      </div>
      <div class="header-actions">
        <span v-if="syncStatus !== 'idle'" class="sync-status" :class="syncStatus">
          {{ syncStatusText }}
        </span>
        <button 
          @click="handleSaveDraft" 
          class="btn-secondary save-btn" 
          :disabled="syncStatus === 'saving' || !hasUnsavedChanges"
        >
          存草稿
        </button>
        <button @click="handlePublish" class="btn-primary publish-btn" :disabled="isPublishing">
          {{ isPublishing ? '发布中...' : '发布' }}
        </button>
      </div>
    </header>

    <main class="editor-content">
      <div class="editor-form">
        <div class="input-group title-group">
          <input
            id="title"
            v-model="form.title"
            type="text"
            placeholder="填写标题会有更多赞哦~"
            maxlength="100"
            class="title-input"
          />
        </div>

        <div class="input-group content-group">
          <textarea
            v-model="form.content"
            placeholder="分享你此刻的想法..."
            class="content-input"
          ></textarea>
        </div>

        <div class="media-section">
          <div class="images-grid">
            <div
              v-for="(image, index) in form.images"
              :key="index"
              class="image-item"
            >
              <img :src="image.url" :alt="`Image ${index + 1}`" />
              <button
                type="button"
                @click="removeImage(index)"
                class="remove-btn"
              >
                ✕
              </button>
            </div>
            
            <div v-if="form.images.length < 9" class="upload-trigger" @click="triggerFileInput">
              <input
                ref="fileInput"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                @change="handleImageUpload"
                class="hidden-input"
              />
              <span class="plus-icon">+</span>
              <span class="upload-text">照片/视频</span>
            </div>
          </div>
          <p class="upload-hint" v-if="form.images.length === 0">
            支持 JPG、PNG、WebP，最多 9 张
          </p>
        </div>
      </div>
    </main>

    <ConfirmModal
      :is-open="showExitModal"
      message="保留此次编辑？"
      confirm-text="保留"
      cancel-text="不保留"
      @confirm="confirmExit(true)"
      @cancel="confirmExit(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useDraftStore } from '@/stores/draft'
import { apiClient } from '@/utils/api'
import { isOnline } from '@/utils/offline'
import type { ArticleImage } from '@/types/models'
import ConfirmModal from '@/components/ConfirmModal.vue'

const router = useRouter()
const draftStore = useDraftStore()
const fileInput = ref<HTMLInputElement | null>(null)

const form = ref({
  title: '',
  content: '',
  images: [] as ArticleImage[],
})

const isPublishing = ref(false)
const error = ref('')
const syncStatus = ref<'idle' | 'saving' | 'syncing' | 'error'>('idle')
const showExitModal = ref(false)
const pendingRoute = ref<any>(null)

const syncStatusText = computed(() => {
  const statusMap = {
    idle: '',
    saving: '保存中...',
    syncing: '同步中...',
    error: '保存失败',
  }
  return statusMap[syncStatus.value]
})

const hasUnsavedChanges = ref(false)

// 监听内容变化
watch(
  () => form.value,
  () => {
    if (!hasUnsavedChanges.value) {
      hasUnsavedChanges.value = true
    }
  },
  { deep: true }
)

onMounted(async () => {
  // 加载已有草稿
  try {
    await draftStore.loadDraft()
    if (draftStore.currentDraft) {
      form.value = {
        title: draftStore.currentDraft.title,
        content: draftStore.currentDraft.content,
        images: draftStore.currentDraft.images,
      }
      // 重置未保存状态
      setTimeout(() => {
        hasUnsavedChanges.value = false
      }, 0)
    }
  } catch (err) {
    console.error('Failed to load draft:', err)
  }
})

const handleBack = () => {
  if (hasUnsavedChanges.value) {
    showExitModal.value = true
  } else {
    router.back()
  }
}

// 路由守卫
onBeforeRouteLeave((to, from, next) => {
  if (showExitModal.value) {
    // 如果模态框已经打开，阻止导航
    next(false)
    return
  }

  if (hasUnsavedChanges.value) {
    // 触发模态框
    showExitModal.value = true
    pendingRoute.value = next
    next(false)
  } else {
    next()
  }
})

const confirmExit = async (save: boolean) => {
  showExitModal.value = false
  
  if (save) {
    try {
      await handleSaveDraft()
      if (pendingRoute.value) pendingRoute.value()
      else router.back()
    } catch (err) {
      alert('保存失败，请重试')
    }
  } else {
    hasUnsavedChanges.value = false
    if (pendingRoute.value) pendingRoute.value()
    else router.back()
  }
  pendingRoute.value = null
}

const handleSaveDraft = async () => {
  syncStatus.value = 'saving'
  try {
    await draftStore.saveDraft({
      title: form.value.title,
      content: form.value.content,
      images: form.value.images,
    })
    syncStatus.value = 'idle'
    hasUnsavedChanges.value = false
  } catch (err) {
    syncStatus.value = 'error'
    throw err
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files) return

  for (const file of files) {
    if (form.value.images.length >= 9) break

    // 验证文件大小
    if (file.size > 5 * 1024 * 1024) {
      error.value = '图片大小不能超过 5MB'
      continue
    }

    // 创建本地预览
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.images.push({
        url: e.target?.result as string,
        uploadedAt: new Date().toISOString(),
      })
    }
    reader.readAsDataURL(file)
  }

  // 重置 input
  input.value = ''
}

const removeImage = (index: number) => {
  form.value.images.splice(index, 1)
}

const handlePublish = async () => {
  if (!form.value.title.trim()) {
    alert('请输入文章标题')
    return
  }

  if (!form.value.content.trim()) {
    alert('请输入文章内容')
    return
  }

  isPublishing.value = true
  error.value = ''

  try {
    // 先保存草稿
    const draft = await draftStore.saveDraft({
      title: form.value.title,
      content: form.value.content,
      images: form.value.images,
    })

    hasUnsavedChanges.value = false

    // 然后发布
    if (isOnline.value) {
      const response = await apiClient.post('/articles', {
        title: form.value.title,
        content: form.value.content,
        images: form.value.images,
        tags: [],
      })

      if (response.data) {
        // 发布成功，删除草稿
        await draftStore.deleteDraft(draft._id)
        
        // 返回 Feed
        router.push('/feed')
      }
    } else {
      error.value = '网络已断开，内容已保存到本地'
    }
  } catch (err: any) {
    error.value = err.message || '发布失败'
  } finally {
    isPublishing.value = false
  }
}
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #fff;
}

.editor-header {
  height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 0.5px solid #f2f2f2;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #333;
  cursor: pointer;
  padding: 4px 8px;
  margin-left: -8px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-status {
  font-size: 12px;
  color: #999;
}

.save-btn {
  font-size: 14px;
  color: #333;
  background: #f2f2f2;
  padding: 6px 12px;
  border-radius: 2px;
  border: none;
}

.publish-btn {
  font-size: 14px;
  background-color: #fe2c55;
  color: white;
  padding: 6px 16px;
  border-radius: 2px;
  border: none;
  font-weight: 500;
}

.publish-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
}

.editor-form {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.title-input {
  width: 100%;
  border: none;
  font-size: 18px;
  font-weight: bold;
  padding: 12px 0;
  outline: none;
  color: #161823;
}

.title-input::placeholder {
  color: #808080;
}

.content-input {
  width: 100%;
  min-height: 150px;
  border: none;
  font-size: 16px;
  padding: 0;
  outline: none;
  resize: none;
  line-height: 1.5;
  color: #161823;
  font-family: inherit;
}

.content-input::placeholder {
  color: #808080;
}

.media-section {
  margin-top: 20px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.image-item {
  position: relative;
  width: 100%;
  padding-bottom: 100%; /* 1:1 Aspect Ratio */
  border-radius: 4px;
  overflow: hidden;
  background-color: #f8f8f8;
}

.image-item img {
  position: absolute;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.upload-trigger {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  background-color: #f8f8f8;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.hidden-input {
  display: none;
}

.plus-icon {
  position: absolute;
  top: 35%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 32px;
  color: #999;
  font-weight: 300;
}

.upload-text {
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: #999;
}

.upload-hint {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>
