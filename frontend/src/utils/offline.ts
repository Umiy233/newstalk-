/**
 * 离线管理工具
 * SPEC: SPEC-DRAFT-OFFLINE-001, SPEC-DRAFT-OFFLINE-002
 */

import { ref } from 'vue'
import { syncQueueDB } from './db'

/**
 * 离线状态管理
 */
export const isOnline = ref(navigator.onLine)

/**
 * 初始化离线监听
 */
export function initOfflineListener(
  onOnline?: () => Promise<void>,
  onOffline?: () => void
): void {
  window.addEventListener('online', async () => {
    isOnline.value = true
    console.log('[Offline] Network recovered')

    // 触发在线回调，通常用于同步数据
    if (onOnline) {
      try {
        await onOnline()
      } catch (error) {
        console.error('[Offline] Failed to sync on online:', error)
      }
    }
  })

  window.addEventListener('offline', () => {
    isOnline.value = false
    console.log('[Offline] Network disconnected')

    if (onOffline) {
      onOffline()
    }
  })
}

/**
 * 检查是否在线
 */
export function checkOnline(): boolean {
  return navigator.onLine
}

/**
 * 添加离线任务到队列
 */
export async function queueOfflineTask(
  type: 'draft' | 'article',
  action: 'create' | 'update' | 'delete',
  data: any
): Promise<void> {
  await syncQueueDB.addToQueue({
    id: '',
    type,
    action,
    data,
    timestamp: Date.now(),
  })
  console.log(`[Offline] Task queued: ${type} ${action}`)
}

/**
 * 获取待处理的离线任务
 */
export async function getPendingTasks() {
  return await syncQueueDB.getPendingItems()
}

/**
 * 清空离线任务队列
 */
export async function clearOfflineTasks(): Promise<void> {
  await syncQueueDB.clearQueue()
}

/**
 * 移除已处理的离线任务
 */
export async function removeOfflineTask(taskId: number): Promise<void> {
  await syncQueueDB.removeItem(taskId)
}

/**
 * 判断是否有离线任务待处理
 */
export async function hasPendingTasks(): Promise<boolean> {
  const tasks = await getPendingTasks()
  return tasks.length > 0
}

/**
 * 处理冲突 - 比较本地和远程时间戳
 */
export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'manual'
  selectedVersion?: 'local' | 'remote'
}

export async function handleConflict(
  localTimestamp: number,
  remoteTimestamp: number
): Promise<ConflictResolution> {
  // 如果本地更新，使用本地版本
  if (localTimestamp > remoteTimestamp) {
    return {
      strategy: 'local',
      selectedVersion: 'local',
    }
  }

  // 否则使用远程版本
  return {
    strategy: 'remote',
    selectedVersion: 'remote',
  }
}

