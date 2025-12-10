<template>
  <div class="article-detail-container">
    <header class="article-header">
      <router-link to="/feed" class="back-btn">← 返回</router-link>
      <h1>文章详情</h1>
    </header>

    <main class="article-content">
      <div v-if="isLoading" class="loading">加载中...</div>
      <div v-else-if="article" class="article">
        <h1>{{ article.title }}</h1>
        <div class="article-meta">
          <span class="author">{{ article.author?.username }}</span>
          <span class="date">{{ formatDate(article.createdAt) }}</span>
          <span class="view-count">👁️ {{ article.viewCount }}</span>
        </div>
        <div class="article-body" v-html="article.content"></div>
        <div v-if="article.images.length > 0" class="article-images">
          <img
            v-for="(image, index) in article.images"
            :key="index"
            :src="image.url"
            :alt="`Image ${index + 1}`"
          />
        </div>
      </div>
      <div v-else class="not-found">文章不存在</div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { apiClient } from '@/utils/api'
import { formatDate } from '@/utils/common'
import type { Article } from '@/types/models'

const route = useRoute()

const article = ref<Article | null>(null)
const isLoading = ref(false)

onMounted(async () => {
  const articleId = route.params.id as string
  isLoading.value = true

  try {
    const response = await apiClient.get(`/articles/${articleId}`)
    article.value = response.data
  } catch (error) {
    console.error('Failed to load article:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.article-detail-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: white;
}

.article-header {
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.back-btn {
  font-size: 18px;
  color: var(--primary-color);
}

.article-header h1 {
  flex: 1;
  margin: 0;
  font-size: 20px;
}

.article-content {
  flex: 1;
  padding: var(--spacing-lg);
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.article h1 {
  margin: 0 0 var(--spacing-lg) 0;
  font-size: 32px;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  gap: var(--spacing-lg);
  font-size: 14px;
  color: #999;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-lg);
  border-bottom: 1px solid var(--border-color);
}

.article-body {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: var(--spacing-lg);
}

.article-body :deep(p) {
  margin: var(--spacing-md) 0;
}

.article-body :deep(h1) {
  font-size: 2em;
  font-weight: bold;
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
}

.article-body :deep(h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
}

.article-body :deep(h3) {
  font-size: 1.25em;
  font-weight: bold;
  margin: var(--spacing-lg) 0 var(--spacing-md) 0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  padding-left: 1.5em;
  margin: var(--spacing-md) 0;
}

.article-body :deep(li) {
  margin: 0.25em 0;
}

.article-body :deep(blockquote) {
  border-left: 3px solid #e5e7eb;
  padding-left: 1em;
  margin: var(--spacing-lg) 0;
  color: #6b7280;
  font-style: italic;
}

.article-body :deep(pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin: var(--spacing-lg) 0;
}

.article-body :deep(code) {
  background: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
  font-family: 'Courier New', monospace;
}

.article-body :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

.article-body :deep(hr) {
  border: none;
  border-top: 2px solid #e5e7eb;
  margin: var(--spacing-xl) 0;
}

.article-body :deep(strong) {
  font-weight: bold;
}

.article-body :deep(em) {
  font-style: italic;
}

.article-body :deep(s) {
  text-decoration: line-through;
}

.article-images {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-top: var(--spacing-lg);
}

.article-images img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.loading,
.not-found {
  text-align: center;
  padding: var(--spacing-xl);
  color: #999;
}
</style>

