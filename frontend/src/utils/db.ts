/**
 * IndexedDB 操作工具
 * SPEC: SPEC-DRAFT-OFFLINE-001, SPEC-DRAFT-OFFLINE-002
 */

import Dexie from 'dexie'
import type { IndexedDBDraft, SyncQueueItem } from '@/types/models'

// 创建数据库
export const db = new Dexie('news-app-db')

db.version(1).stores({
  drafts: '++id, userId, lastEditedAt',
  syncQueue: '++id, type, timestamp',
  cache: 'key, expireAt',
})

export interface CacheItem {
  key: string
  value: any
  expireAt: number
}

/**
 * 草稿相关操作
 */
export const draftDB = {
  /**
   * 保存草稿
   */
  async saveDraft(draft: IndexedDBDraft): Promise<string> {
    const id = await db.table<IndexedDBDraft>('drafts').put({
      ...draft,
      lastEditedAt: Date.now(),
    })
    return id.toString()
  },

  /**
   * 获取用户所有草稿
   */
  async getUserDrafts(userId: string): Promise<IndexedDBDraft[]> {
    return db.table<IndexedDBDraft>('drafts').where('userId').equals(userId).toArray()
  },

  /**
   * 获取最新草稿
   */
  async getLatestDraft(userId: string): Promise<IndexedDBDraft | undefined> {
    return db
      .table<IndexedDBDraft>('drafts')
      .where('userId')
      .equals(userId)
      .last()
  },

  /**
   * 删除草稿
   */
  async deleteDraft(draftId: string): Promise<void> {
    await db.table<IndexedDBDraft>('drafts').delete(parseInt(draftId))
  },

  /**
   * 清空用户所有草稿
   */
  async clearUserDrafts(userId: string): Promise<void> {
    await db.table<IndexedDBDraft>('drafts').where('userId').equals(userId).delete()
  },
}

/**
 * 同步队列相关操作
 */
export const syncQueueDB = {
  /**
   * 添加到同步队列
   */
  async addToQueue(item: SyncQueueItem): Promise<number> {
    return db.table<SyncQueueItem>('syncQueue').add({
      ...item,
      timestamp: Date.now(),
    })
  },

  /**
   * 获取待同步项
   */
  async getPendingItems(): Promise<SyncQueueItem[]> {
    return db.table<SyncQueueItem>('syncQueue').toArray()
  },

  /**
   * 删除同步项
   */
  async removeItem(id: number): Promise<void> {
    await db.table<SyncQueueItem>('syncQueue').delete(id)
  },

  /**
   * 清空同步队列
   */
  async clearQueue(): Promise<void> {
    await db.table<SyncQueueItem>('syncQueue').clear()
  },
}

/**
 * 缓存相关操作
 */
export const cacheDB = {
  /**
   * 设置缓存
   */
  async set(key: string, value: any, ttl: number = 5 * 60 * 1000): Promise<void> {
    await db.table<CacheItem>('cache').put({
      key,
      value,
      expireAt: Date.now() + ttl,
    })
  },

  /**
   * 获取缓存
   */
  async get(key: string): Promise<any> {
    const item = await db.table<CacheItem>('cache').get(key)
    if (!item) return null

    // 检查是否过期
    if (item.expireAt < Date.now()) {
      await this.remove(key)
      return null
    }

    return item.value
  },

  /**
   * 删除缓存
   */
  async remove(key: string): Promise<void> {
    await db.table<CacheItem>('cache').delete(key)
  },

  /**
   * 清空所有过期缓存
   */
  async clearExpired(): Promise<void> {
    const now = Date.now()
    await db.table<CacheItem>('cache').where('expireAt').below(now).delete()
  },

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    await db.table<CacheItem>('cache').clear()
  },
}

/**
 * 定期清理过期缓存
 */
export function startCacheCleanup(interval: number = 60 * 1000): void {
  setInterval(() => {
    cacheDB.clearExpired()
  }, interval)
}

