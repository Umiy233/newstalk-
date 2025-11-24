/**
 * 草稿状态管理
 * SPEC: SPEC-DRAFT-001, SPEC-DRAFT-002, SPEC-DRAFT-003, SPEC-DRAFT-004
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/api'
import { draftDB, cacheDB } from '@/utils/db'
import { isOnline, queueOfflineTask } from '@/utils/offline'
import type { Draft, SaveDraftRequest, ApiResponse } from '@/types/models'

export const useDraftStore = defineStore('draft', () => {
  // State
  const currentDraft = ref<Draft | null>(null)
  const drafts = ref<Draft[]>([])
  const isSaving = ref(false)
  const syncStatus = ref<'idle' | 'saving' | 'syncing' | 'error'>('idle')
  const error = ref<string | null>(null)
  const autoSaveTimer = ref<NodeJS.Timeout | null>(null)

  // Getters
  const isDraft = computed(() => !!currentDraft.value)
  const draftCount = computed(() => drafts.value.length)

  /**
   * 加载草稿
   * SPEC-DRAFT-002
   */
  async function loadDraft(draftId?: string): Promise<void> {
    try {
      let draft: Draft | undefined

      // 如果指定了 draftId，查询特定草稿
      if (draftId) {
        const response = await apiClient.get<Draft>(`/drafts/${draftId}`)
        draft = response.data
      } else {
        // 否则加载当前最新草稿
        const response = await apiClient.get<Draft>('/drafts/current')
        draft = response.data
      }

      if (draft) {
        currentDraft.value = draft
        // 缓存草稿
        await cacheDB.set(`draft:${draft._id}`, draft, 10 * 60 * 1000)
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 保存草稿
   * SPEC-DRAFT-001
   */
  async function saveDraft(request: SaveDraftRequest): Promise<Draft> {
    if (isSaving.value) {
      return currentDraft.value!
    }

    isSaving.value = true
    syncStatus.value = 'saving'
    error.value = null

    try {
      const userId = 'current-user-id' // 从 auth store 获取

      // 计算 checksum 用于冲突检测
      const localChecksum = calculateChecksum(request)

      let draft: Draft

      if (isOnline.value) {
        // 在线：发送到服务器
        const response = await apiClient.post<Draft>('/drafts', {
          ...request,
          localChecksum,
        })

        draft = response.data!
        syncStatus.value = 'synced'
      } else {
        // 离线：保存到本地 IndexedDB
        if (!currentDraft.value) {
          // 创建新草稿
          const draftId = await draftDB.saveDraft({
            draftId: `local-${Date.now()}`,
            userId,
            title: request.title,
            content: request.content,
            images: request.images,
            lastEditedAt: Date.now(),
            offlineOnly: true,
          })

          // 创建本地草稿对象
          draft = {
            _id: draftId,
            userId,
            articleId: request.articleId,
            title: request.title,
            content: request.content,
            images: request.images,
            lastSavedAt: new Date().toISOString(),
            lastEditedAt: new Date().toISOString(),
            status: 'synced',
            localChecksum,
          }

          // 添加到同步队列，待网络恢复时同步
          await queueOfflineTask('draft', 'create', draft)
        } else {
          // 更新现有草稿
          const updated = {
            ...currentDraft.value,
            title: request.title,
            content: request.content,
            images: request.images,
            lastSavedAt: new Date().toISOString(),
            lastEditedAt: new Date().toISOString(),
            status: 'synced' as const,
            localChecksum,
          }

          await draftDB.saveDraft({
            draftId: updated._id,
            userId,
            title: updated.title,
            content: updated.content,
            images: updated.images,
            lastEditedAt: Date.now(),
            offlineOnly: true,
          })

          draft = updated
          await queueOfflineTask('draft', 'update', draft)
        }

        syncStatus.value = 'synced'
      }

      currentDraft.value = draft
      return draft
    } catch (err: any) {
      syncStatus.value = 'error'
      error.value = err.message

      // 如果网络错误，自动切换到离线模式保存
      if (!isOnline.value) {
        const userId = 'current-user-id'
        const draftId = await draftDB.saveDraft({
          draftId: currentDraft.value?._id || `local-${Date.now()}`,
          userId,
          title: request.title,
          content: request.content,
          images: request.images,
          lastEditedAt: Date.now(),
          offlineOnly: true,
        })
        console.warn('[Draft] Auto-saved to offline storage')
      }

      throw err
    } finally {
      isSaving.value = false
    }
  }

  /**
   * 删除草稿
   * SPEC-DRAFT-003
   */
  async function deleteDraft(draftId: string): Promise<void> {
    try {
      if (isOnline.value) {
        await apiClient.delete(`/drafts/${draftId}`)
      } else {
        await queueOfflineTask('draft', 'delete', { _id: draftId })
      }

      if (currentDraft.value?._id === draftId) {
        currentDraft.value = null
      }

      drafts.value = drafts.value.filter((d) => d._id !== draftId)
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 发布草稿为文章
   * SPEC-DRAFT-004
   */
  async function publishDraft(draftId?: string): Promise<string> {
    const targetDraft = draftId
      ? drafts.value.find((d) => d._id === draftId)
      : currentDraft.value

    if (!targetDraft) {
      throw new Error('Draft not found')
    }

    try {
      const response = await apiClient.post<{ articleId: string }>(
        `/drafts/${targetDraft._id}/publish`
      )

      const articleId = response.data!.articleId

      // 发布成功后删除草稿
      await deleteDraft(targetDraft._id)

      return articleId
    } catch (err: any) {
      error.value = err.message
      throw err
    }
  }

  /**
   * 启用自动保存
   * 每 30 秒自动保存一次
   */
  function startAutoSave(request: SaveDraftRequest, interval: number = 30000): void {
    // 清除旧的定时器
    if (autoSaveTimer.value) {
      clearInterval(autoSaveTimer.value)
    }

    // 设置新的定时器
    autoSaveTimer.value = setInterval(async () => {
      try {
        await saveDraft(request)
        console.log('[Draft] Auto-saved')
      } catch (err) {
        console.error('[Draft] Auto-save failed:', err)
      }
    }, interval)
  }

  /**
   * 停止自动保存
   */
  function stopAutoSave(): void {
    if (autoSaveTimer.value) {
      clearInterval(autoSaveTimer.value)
      autoSaveTimer.value = null
    }
  }

  /**
   * 计算内容 checksum（用于冲突检测）
   */
  function calculateChecksum(request: SaveDraftRequest): string {
    const content = `${request.title}|${request.content}|${request.images.map((i) => i.url).join(',')}`
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString(16)
  }

  return {
    // State
    currentDraft,
    drafts,
    isSaving,
    syncStatus,
    error,

    // Getters
    isDraft,
    draftCount,

    // Actions
    loadDraft,
    saveDraft,
    deleteDraft,
    publishDraft,
    startAutoSave,
    stopAutoSave,
  }
})

