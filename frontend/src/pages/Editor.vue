<template>
  <div class="editor-container">
    <header class="editor-header">
      <div class="header-left">
        <button @click="handleBack" class="back-btn">取消</button>
      </div>
      <div class="header-actions">
        <span v-if="syncStatus !== 'idle'" class="sync-status" :class="syncStatus">
          {{ syncStatusText }}
        </span>
        <button 
          v-if="isEditMode" 
          @click="handleDelete" 
          class="btn-danger delete-btn" 
          :disabled="isDeleting"
        >
          {{ isDeleting ? '删除中...' : '删除' }}
        </button>
        <button @click="handlePublish" class="btn-primary publish-btn" :disabled="isPublishing">
          {{ publishButtonText }}
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
            placeholder="添加标题"
            maxlength="100"
            class="title-input"
          />
        </div>

        <div class="input-group content-group">
          <editor-content :editor="editor" class="tiptap-content" />
        </div>

        <!-- 话题输入区域 -->
        <div class="topic-section">
          <button 
            v-if="!showTopicInput && form.topics.length === 0"
            class="add-topic-btn" 
            @click="focusTopicInput"
          >
            <span class="topic-icon">#</span>
            <span class="topic-text">添加话题</span>
          </button>
          
          <div v-if="showTopicInput || form.topics.length > 0" class="topic-content">
            <!-- 已添加的话题标签 -->
            <span 
              v-for="(topic, index) in form.topics" 
              :key="index"
              class="topic-tag"
            >
              #{{ topic }}
              <button class="remove-tag" @click="removeTopic(index)">×</button>
            </span>
            
            <!-- 输入框和添加按钮 -->
            <div class="topic-input-wrapper">
              <input
                ref="topicInput"
                v-model="currentTopic"
                type="text"
                placeholder="添加话题"
                class="topic-input"
                @input="handleTopicInput"
              />
              <button 
                v-if="currentTopic.trim()"
                class="add-topic-confirm-btn"
                @click="addTopic"
              >
                完成
              </button>
            </div>
          </div>
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
            
            <div 
              v-if="form.images.length < 9" 
              class="upload-trigger" 
              @click="triggerFileInput"
              :class="{ 'uploading': isUploading }"
            >
              <input
                ref="fileInput"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                @change="handleImageUpload"
                class="hidden-input"
                :disabled="isUploading"
              />
              <span class="plus-icon">+</span>
              <span class="upload-text">{{ isUploading ? '上传中...' : '照片/视频' }}</span>
            </div>
          </div>
          <p class="upload-hint" v-if="form.images.length === 0">
            支持 JPG、PNG、WebP，最多 9 张，单张最大 20MB
          </p>
          <!-- 上传进度提示 -->
          <div v-if="uploadStatus !== ''" class="upload-status">
            <div class="upload-status-text">{{ uploadStatus }}</div>
            <div v-if="hashProgress > 0" class="upload-progress-bar">
              <div class="upload-progress-fill" :style="{ width: `${hashProgress}%` }"></div>
            </div>
          </div>
        </div>

       
      </div>
    </main>

    <!-- 底部工具栏 -->
    <footer class="editor-footer">
      <div class="editor-toolbar">
        <button 
          type="button"
          @click="editor?.chain().focus().undo().run()"
          :disabled="!editor?.can().undo()"
          class="toolbar-btn"
          title="撤销"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path>
          </svg>
        </button>
        <button 
          type="button"
          @click="editor?.chain().focus().redo().run()"
          :disabled="!editor?.can().redo()"
          class="toolbar-btn"
          title="重做"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 7v6h-6"></path>
            <path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"></path>
          </svg>
        </button>
        
        <div class="toolbar-divider"></div>
        
        <button 
          type="button"
          @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
          :class="{ 'is-active': editor?.isActive('heading', { level: 1 }) }"
          class="toolbar-btn"
          title="标题1"
        >
          H1
        </button>
        <button 
          type="button"
          @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
          :class="{ 'is-active': editor?.isActive('heading', { level: 2 }) }"
          class="toolbar-btn"
          title="标题2"
        >
          H2
        </button>
        
        <div class="toolbar-divider"></div>
        
        <button 
          type="button"
          @click="editor?.chain().focus().toggleBold().run()"
          :class="{ 'is-active': editor?.isActive('bold') }"
          class="toolbar-btn"
          title="加粗"
        >
          <strong>B</strong>
        </button>
        <button 
          type="button"
          @click="editor?.chain().focus().toggleStrike().run()"
          :class="{ 'is-active': editor?.isActive('strike') }"
          class="toolbar-btn"
          title="删除线"
        >
          <strong>S</strong>
        </button>
        
        <div class="toolbar-divider"></div>
        
        <button 
          type="button"
          @click="editor?.chain().focus().toggleBlockquote().run()"
          :class="{ 'is-active': editor?.isActive('blockquote') }"
          class="toolbar-btn"
          title="引用"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"></path>
          </svg>
        </button>
        
        <button 
          type="button"
          @click="editor?.chain().focus().toggleBulletList().run()"
          :class="{ 'is-active': editor?.isActive('bulletList') }"
          class="toolbar-btn"
          title="无序列表"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <circle cx="4" cy="6" r="1" fill="currentColor"></circle>
            <circle cx="4" cy="12" r="1" fill="currentColor"></circle>
            <circle cx="4" cy="18" r="1" fill="currentColor"></circle>
          </svg>
        </button>
        
        <button 
          type="button"
          @click="editor?.chain().focus().toggleOrderedList().run()"
          :class="{ 'is-active': editor?.isActive('orderedList') }"
          class="toolbar-btn"
          title="有序列表"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="10" y1="6" x2="21" y2="6"></line>
            <line x1="10" y1="12" x2="21" y2="12"></line>
            <line x1="10" y1="18" x2="21" y2="18"></line>
            <path d="M4 6h1v4"></path>
            <path d="M4 10h2"></path>
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
          </svg>
        </button>
      </div>
    </footer>

    <ConfirmModal
      :is-open="showExitModal"
      message="保留此次编辑？"
      confirm-text="保留"
      cancel-text="不保留"
      @confirm="confirmExit(true)"
      @cancel="confirmExit(false)"
    />

    <ConfirmModal
      :is-open="showDeleteModal"
      message="确定要删除这篇文章吗？删除后无法恢复。"
      confirm-text="删除"
      cancel-text="取消"
      @confirm="confirmDelete"
      @cancel="cancelDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useDraftStore } from '@/stores/draft'
import { apiClient } from '@/utils/api'
import { isOnline } from '@/utils/offline'
import type { ArticleImage, Article } from '@/types/models'
import ConfirmModal from '@/components/ConfirmModal.vue'
import { createChunks, hash, checkFileExists, getUploadedChunks, uploadChunk, mergeChunks } from '@/utils/file'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

const router = useRouter()
const route = useRoute()
const draftStore = useDraftStore()
const fileInput = ref<HTMLInputElement | null>(null)

const form = ref({
  title: '',
  content: '',
  images: [] as ArticleImage[],
  topics: [] as string[], // 话题数组
})

const isPublishing = ref(false)
const isDeleting = ref(false)
const error = ref('')
const syncStatus = ref<'idle' | 'saving' | 'syncing' | 'error'>('idle')
const showExitModal = ref(false)
const showDeleteModal = ref(false)
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

// 检查是否有任何内容（用于判断是否需要提示保存）
const hasAnyContent = computed(() => {
  const hasTitle = form.value.title.trim().length > 0
  const hasContent = form.value.content.trim().length > 0 && form.value.content !== '<p></p>'
  const hasImages = form.value.images.length > 0
  const hasTopics = form.value.topics.length > 0
  return hasTitle || hasContent || hasImages || hasTopics
})

// 判断是否是编辑模式
const isEditMode = computed(() => {
  return !!route.query.articleId
})

// 发布按钮文本
const publishButtonText = computed(() => {
  if (isPublishing.value) {
    return isEditMode.value ? '修改中...' : '发布中...'
  }
  return isEditMode.value ? '确认修改' : '发布'
})

const hashProgress = ref(0) //文件上传哈希计算进度
const uploadStatus = ref('') //上传状态文本
const isUploading = ref(false) //是否正在上传

// 话题输入相关
const showTopicInput = ref(false)
const currentTopic = ref('')
const topicInput = ref<HTMLInputElement | null>(null)

// 初始化 Tiptap 编辑器
const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Placeholder.configure({
      placeholder: '添加正文...',
    }),
  ],
  content: form.value.content || '<p></p>',
  editorProps: {
    attributes: {
      class: 'tiptap-editor',
    },
  },
  onUpdate: ({ editor }) => {
    // 将编辑器内容同步到 form.content
    form.value.content = editor.getHTML()
  },
})

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
  // 检查是否是编辑已有文章
  const articleId = route.query.articleId as string
  
  if (articleId) {
    // 编辑模式：加载已有文章
    try {
      const response = await apiClient.get<Article>(`/articles/${articleId}`)
      const article = response.data
      
      if (article) {
        form.value = {
          title: article.title,
          content: article.content,
          images: article.images || [],
          topics: article.tags || [],
        }
        // 更新编辑器内容
        if (editor.value) {
          editor.value.commands.setContent(article.content || '')
        }
        // 重置未保存状态
        setTimeout(() => {
          hasUnsavedChanges.value = false
        }, 0)
      }
    } catch (err) {
      console.error('Failed to load article:', err)
      alert('加载文章失败')
    }
  } else {
    // 新建模式：加载草稿
    try {
      await draftStore.loadDraft()
      if (draftStore.currentDraft) {
        form.value = {
          title: draftStore.currentDraft.title,
          content: draftStore.currentDraft.content,
          images: draftStore.currentDraft.images,
          topics: [],
        }
        // 更新编辑器内容
        if (editor.value) {
          editor.value.commands.setContent(draftStore.currentDraft.content || '')
        }
        // 重置未保存状态
        setTimeout(() => {
          hasUnsavedChanges.value = false
        }, 0)
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }
})

onBeforeUnmount(() => {
  // 销毁编辑器实例
  editor.value?.destroy()
})

const handleBack = () => {
  // 编辑模式：直接返回，不保存草稿
  if (isEditMode.value) {
    router.back()
    return
  }
  
  // 新建模式：询问是否保存草稿
  if (hasAnyContent.value) {
    showExitModal.value = true
  } else {
    router.back()
  }
}

// 路由守卫
onBeforeRouteLeave((_to, _from, next) => {
  // 编辑模式：直接允许离开，不保存草稿
  if (isEditMode.value) {
    next()
    return
  }
  
  // 新建模式：检查是否需要保存草稿
  if (showExitModal.value) {
    // 如果模态框已经打开，阻止导航
    next(false)
    return
  }

  if (hasAnyContent.value) {
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
    // 选择保存
    try {
      await handleSaveDraft()
      if (pendingRoute.value) pendingRoute.value()
      else router.back()
    } catch (err) {
      alert('保存失败，请重试')
    }
  } else {
    // 选择不保存，清空所有草稿
    try {
      if (draftStore.currentDraft?._id) {
        await draftStore.deleteDraft(draftStore.currentDraft._id)
      }
      // 清空表单
      form.value = {
        title: '',
        content: '',
        images: [],
        topics: [],
      }
      // 清空编辑器内容
      if (editor.value) {
        editor.value.commands.setContent('<p></p>')
      }
      hasUnsavedChanges.value = false
      
      // 继续导航
      if (pendingRoute.value) pendingRoute.value()
      else router.back()
    } catch (err) {
      console.error('删除草稿失败:', err)
      // 即使删除失败也继续导航
      if (pendingRoute.value) pendingRoute.value()
      else router.back()
    }
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

// 获取网络状态，动态调整分片大小
const getChunkSize = (): number => {
  // @ts-ignore - navigator.connection 可能不存在
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (connection) {
    const effectiveType = connection.effectiveType
    // 根据网络类型调整分片大小
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 512 * 1024 // 512KB for slow networks
    } else if (effectiveType === '3g') {
      return 768 * 1024 // 768KB for 3G
    }
  }
  return 1 * 1024 * 1024 // 1MB for 4G/WiFi
}

// 创建本地预览
const createLocalPreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      resolve(e.target?.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 上传单个图片（使用大文件上传）
const uploadSingleImage = async (file: File): Promise<string> => {
  const chunkSize = getChunkSize()
  const chunks = createChunks(file, chunkSize)
  
  // 1. 计算文件 hash
  uploadStatus.value = '计算文件指纹...'
  hashProgress.value = 0
  const hashResult = await hash(chunks, file.size, (progress: number) => {
    hashProgress.value = progress
  })
  hashProgress.value = 100

  // 2. 文件秒传：检查文件是否已存在
  uploadStatus.value = '检查文件是否存在...'
  const fileInfo = await checkFileExists(hashResult, file.name, file.size)
  if (fileInfo?.exists && fileInfo.url) {
    // 文件已存在，直接使用（秒传成功）
    uploadStatus.value = '文件秒传成功！'
    setTimeout(() => {
      uploadStatus.value = ''
      hashProgress.value = 0
    }, 1000)
    return fileInfo.url
  }

  // 3. 断点续传：查询已上传的分片
  uploadStatus.value = '查询已上传分片...'
  const uploadedChunks = await getUploadedChunks(hashResult)
  const uploadedChunkIndices = new Set(uploadedChunks.map((c) => c.chunkIndex))
  
  // 4. 上传缺失的分片
  uploadStatus.value = '上传中...'
  const totalChunks = chunks.length
  let uploadedCount = uploadedChunkIndices.size
  const uploadPromises: Promise<any>[] = []

  for (let i = 0; i < chunks.length; i++) {
    // 跳过已上传的分片
    if (uploadedChunkIndices.has(i)) {
      continue
    }

    // 上传缺失的分片
    const uploadPromise = uploadChunk(
      hashResult,
      i,
      chunks[i],
      (progress: number) => {
        // 计算总体进度：已上传分片数 + 当前分片进度
        const overallProgress = Math.floor(
          ((uploadedCount + progress / 100) / totalChunks) * 100
        )
        hashProgress.value = Math.min(overallProgress, 99) // 留1%给合并
      }
    ).then(() => {
      uploadedCount++
    })

    uploadPromises.push(uploadPromise)
  }

  // 等待所有分片上传完成
  await Promise.all(uploadPromises)
  hashProgress.value = 99

  // 5. 合并所有分片
  uploadStatus.value = '合并文件...'
  const mergeResult = await mergeChunks(hashResult, file.name, totalChunks)
  hashProgress.value = 100

  if (mergeResult?.url) {
    uploadStatus.value = '上传成功！'
    setTimeout(() => {
      uploadStatus.value = ''
      hashProgress.value = 0
    }, 1000)
    return mergeResult.url
  }

  throw new Error('上传失败：未返回文件URL')
}

// 处理图片上传
const handleImageUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (!files || files.length === 0) return

  // 防止重复上传
  if (isUploading.value) {
    error.value = '正在上传中，请稍候...'
    return
  }

  isUploading.value = true
  error.value = ''

  try {
    for (const file of files) {
      if (form.value.images.length >= 9) {
        error.value = '最多只能上传 9 张图片'
        break
      }

      // 验证文件类型
      if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
        error.value = `${file.name} 格式不支持，仅支持 JPG、PNG、WebP`
        continue
      }

      // 验证文件大小（提高到20MB）
      if (file.size > 20 * 1024 * 1024) {
        error.value = `${file.name} 大小超过 20MB，请压缩后上传`
        continue
      }

      // 创建本地预览（立即显示）
      const previewUrl = await createLocalPreview(file)
      const tempImage = {
        url: previewUrl,
        uploadedAt: new Date().toISOString(),
      }
      form.value.images.push(tempImage)

      // 后台上传（使用大文件上传）
      try {
        const uploadedUrl = await uploadSingleImage(file)
        // 上传成功后，更新为服务器URL
        const imageIndex = form.value.images.findIndex(img => img.url === previewUrl)
        if (imageIndex !== -1) {
          form.value.images[imageIndex] = {
            url: uploadedUrl,
            uploadedAt: new Date().toISOString(),
          }
        }
      } catch (uploadError: any) {
        // 上传失败，移除预览图片
        const imageIndex = form.value.images.findIndex(img => img.url === previewUrl)
        if (imageIndex !== -1) {
          form.value.images.splice(imageIndex, 1)
        }
        error.value = `${file.name} 上传失败：${uploadError.message || '网络错误'}`
        console.error('图片上传失败:', uploadError)
      }
    }
  } catch (err: any) {
    error.value = err.message || '上传失败，请重试'
    console.error('处理图片上传失败:', err)
  } finally {
    isUploading.value = false
    // 重置 input
    input.value = ''
  }
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
    // 使用用户输入的话题作为标签
    const tagsArray = form.value.topics

    const articleId = route.query.articleId as string
    
    if (articleId) {
      // 编辑模式：直接更新文章，不保存草稿
      if (isOnline.value) {
        const response = await apiClient.put(`/articles/${articleId}`, {
          title: form.value.title,
          content: form.value.content,
          images: form.value.images,
          tags: tagsArray,
        })

        if (response.data) {
          // 更新成功，清空内容以避免触发退出确认
          form.value = {
            title: '',
            content: '',
            images: [],
            topics: [],
          }
          hasUnsavedChanges.value = false
          
          // 返回上一页
          router.back()
        }
      } else {
        error.value = '网络已断开，无法修改文章'
      }
    } else {
      // 新建模式：先保存草稿再发布
      const draft = await draftStore.saveDraft({
        title: form.value.title,
        content: form.value.content,
        images: form.value.images,
      })

      hasUnsavedChanges.value = false

      if (isOnline.value) {
        const response = await apiClient.post('/articles', {
          title: form.value.title,
          content: form.value.content,
          images: form.value.images,
          tags: tagsArray,
        })

        if (response.data) {
          // 发布成功，删除草稿
          if (draft._id) {
            await draftStore.deleteDraft(draft._id)
          }
          
          // 清空内容
          form.value = {
            title: '',
            content: '',
            images: [],
            topics: [],
          }
          
          // 返回 Feed
          router.back()
        }
      } else {
        error.value = '网络已断开，内容已保存到本地'
      }
    }
  } catch (err: any) {
    error.value = err.message || '发布失败'
  } finally {
    isPublishing.value = false
  }
}

// 显示话题输入框并聚焦
const focusTopicInput = () => {
  showTopicInput.value = true
  setTimeout(() => {
    topicInput.value?.focus()
  }, 100)
}

// 话题输入处理
const handleTopicInput = () => {
  // 可以在这里添加实时验证逻辑
}

// 添加话题
const addTopic = () => {
  const topic = currentTopic.value.trim().replace(/^#/, '')
  if (topic && !form.value.topics.includes(topic)) {
    form.value.topics.push(topic)
    currentTopic.value = ''
    hasUnsavedChanges.value = true
    // 添加后继续聚焦输入框
    setTimeout(() => {
      topicInput.value?.focus()
    }, 50)
  }
}

// 移除话题
const removeTopic = (index: number) => {
  form.value.topics.splice(index, 1)
  hasUnsavedChanges.value = true
}

// 显示删除确认对话框
const handleDelete = () => {
  showDeleteModal.value = true
}

// 确认删除文章
const confirmDelete = async () => {
  showDeleteModal.value = false
  isDeleting.value = true
  
  try {
    const articleId = route.query.articleId as string
    
    if (!articleId) {
      return
    }
    
    // 调用删除API
    await apiClient.delete(`/articles/${articleId}`)
    
    // 删除成功，清空表单
    form.value = {
      title: '',
      content: '',
      images: [],
      topics: [],
    }
    
    // 返回上一页
    router.back()
  } catch (err: any) {
    error.value = err.message || '删除失败'
    alert('删除失败：' + (err.message || '未知错误'))
  } finally {
    isDeleting.value = false
  }
}

// 取消删除
const cancelDelete = () => {
  showDeleteModal.value = false
}






</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: var(--bg-color);
}

.editor-header {
  height: 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  background: none;
  border: none;
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0;
  margin: 0;
  font-weight: normal;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--primary-color);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sync-status {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-right: 12px;
}

.delete-btn {
  font-size: 14px;
  background-color: #ff4d4f;
  color: white;
  padding: 6px 16px;
  border-radius: 2px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.delete-btn:hover:not(:disabled) {
  background-color: #ff7875;
}

.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.publish-btn {
  font-size: 14px;
  background-color: var(--primary-color);
  color: white;
  padding: 6px 16px;
  border-radius: 2px;
  border: none;
  font-weight: 500;
  transition: opacity 0.2s;
}

.publish-btn:hover:not(:disabled) {
  opacity: 0.9;
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
  padding-bottom: 140px; /* 为底部操作栏和工具栏留出空间 */
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
  color: var(--text-primary);
  background: transparent;
}

.title-input::placeholder {
  color: var(--text-tertiary);
}

.tiptap-content {
  background: transparent;
  min-height: 150px;
}

.tiptap-content :deep(.tiptap-editor) {
  padding: 0;
  outline: none;
  min-height: 150px;
  font-size: 16px;
  line-height: 1.6;
  color: var(--text-primary);
}

.tiptap-content :deep(.tiptap-editor.ProseMirror) {
  outline: none;
}

/* Tiptap Placeholder 样式 */
.tiptap-content :deep(.tiptap-editor p.is-empty::before) {
  color: var(--text-tertiary);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

.tiptap-content :deep(.tiptap-editor) h1 {
  font-size: 2em;
  font-weight: bold;
  margin: 0.5em 0;
}

.tiptap-content :deep(.tiptap-editor) h2 {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.5em 0;
}

.tiptap-content :deep(.tiptap-editor) h3 {
  font-size: 1.25em;
  font-weight: bold;
  margin: 0.5em 0;
}

.tiptap-content :deep(.tiptap-editor) ul,
.tiptap-content :deep(.tiptap-editor) ol {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.tiptap-content :deep(.tiptap-editor) li {
  margin: 0.25em 0;
}

.tiptap-content :deep(.tiptap-editor) blockquote {
  border-left: 3px solid var(--border-color);
  padding-left: 1em;
  margin: 1em 0;
  color: var(--text-secondary);
  font-style: italic;
}

.tiptap-content :deep(.tiptap-editor) pre {
  background: light-dark(rgba(0, 0, 0, 0.05), #1f2937);
  color: light-dark(#161823, #f9fafb);
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
}

.tiptap-content :deep(.tiptap-editor) code {
  background: light-dark(rgba(0, 0, 0, 0.05), rgba(255, 255, 255, 0.1));
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
  color: var(--text-primary);
}

.tiptap-content :deep(.tiptap-editor) pre code {
  background: none;
  padding: 0;
  color: inherit;
}

.tiptap-content :deep(.tiptap-editor) hr {
  border: none;
  border-top: 2px solid var(--border-color);
  margin: 2em 0;
}

.tiptap-content :deep(.tiptap-editor) strong {
  font-weight: bold;
}

.tiptap-content :deep(.tiptap-editor) em {
  font-style: italic;
}

.tiptap-content :deep(.tiptap-editor) s {
  text-decoration: line-through;
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
  background-color: var(--bg-secondary);
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
  background: light-dark(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.5));
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.remove-btn:hover {
  background: light-dark(rgba(0, 0, 0, 0.8), rgba(0, 0, 0, 0.7));
}

.upload-trigger {
  position: relative;
  width: 100%;
  padding-bottom: 100%;
  background-color: var(--bg-secondary);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.upload-trigger:hover {
  background: var(--hover-color);
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
  color: var(--text-tertiary);
  font-weight: 300;
}

.upload-text {
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: var(--text-tertiary);
}

.upload-hint {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 8px;
}

.upload-trigger.uploading {
  opacity: 0.6;
  pointer-events: none;
}

.upload-status {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.upload-status-text {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.upload-progress-bar {
  width: 100%;
  height: 4px;
  background: light-dark(rgba(0, 0, 0, 0.1), rgba(255, 255, 255, 0.1));
  border-radius: 2px;
  overflow: hidden;
}

.upload-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #fe2c55, #ff6b9d);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.topic-section {
  margin-top: 16px;
  margin-bottom: 20px;
}

.add-topic-btn {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  color: var(--text-secondary);
}

.add-topic-btn:hover {
  background: var(--hover-color);
  border-color: var(--primary-color);
}

.add-topic-btn:active {
  background: var(--hover-color);
}

.topic-icon {
  font-size: 16px;
  margin-right: 6px;
  font-weight: bold;
  color: #fe2c55;
}

.topic-text {
  font-weight: 500;
}

.topic-content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.topic-tag {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  background: light-dark(rgba(254, 44, 85, 0.1), rgba(254, 44, 85, 0.2));
  color: var(--primary-color);
  border-radius: 18px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s;
}

.remove-tag {
  margin-left: 6px;
  background: none;
  border: none;
  color: var(--primary-color);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  opacity: 0.7;
}

.remove-tag:active {
  opacity: 1;
  transform: scale(0.9);
}

.topic-input-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-secondary);
  border-radius: 18px;
  min-width: 140px;
  transition: all 0.3s;
}

.topic-input-wrapper:focus-within {
  background: var(--hover-color);
  border: 1px solid var(--primary-color);
}

.topic-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: var(--text-primary);
  padding: 0;
  outline: none;
  min-width: 80px;
}

.topic-input::placeholder {
  color: var(--text-tertiary);
}

.add-topic-confirm-btn {
  padding: 4px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.add-topic-confirm-btn:hover {
  opacity: 0.9;
}

.add-topic-confirm-btn:active {
  transform: scale(0.95);
  opacity: 0.8;
}

.editor-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-color);
  border-top: 1px solid var(--border-color);
  padding: 6px 12px;
  z-index: 100;
  box-shadow: 0 -1px 3px light-dark(rgba(0, 0, 0, 0.05), rgba(0, 0, 0, 0.2));
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: flex-start;
  max-width: 600px;
  margin: 0 auto;
}

.toolbar-btn {
  padding: 4px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: all 0.2s;
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: 500;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--hover-color);
  color: var(--text-primary);
}

.toolbar-btn:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.toolbar-btn.is-active {
  background: var(--hover-color);
  color: var(--primary-color);
  font-weight: 600;
}

.toolbar-btn svg {
  width: 18px;
  height: 18px;
}

.toolbar-divider {
  width: 1px;
  height: 16px;
  background: var(--border-color);
  margin: 0 6px;
}
</style>
