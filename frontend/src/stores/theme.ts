/**
 * 主题状态管理
 * 管理深色模式和浅色模式的切换
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY_THEME = 'theme:mode'

type ThemeMode = 'light' | 'dark'

export const useThemeStore = defineStore('theme', () => {
  // State
  const mode = ref<ThemeMode>('dark') // 默认深色模式

  /**
   * 初始化主题（从本地存储恢复）
   */
  function initTheme(): void {
    const storedTheme = localStorage.getItem(STORAGE_KEY_THEME) as ThemeMode | null
    if (storedTheme === 'light' || storedTheme === 'dark') {
      mode.value = storedTheme
    } else {
      // 如果没有存储的主题，检查系统偏好
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      mode.value = prefersDark ? 'dark' : 'light'
    }
    applyTheme()
  }

  /**
   * 切换主题
   */
  function toggleTheme(): void {
    mode.value = mode.value === 'light' ? 'dark' : 'light'
    applyTheme()
    localStorage.setItem(STORAGE_KEY_THEME, mode.value)
  }

  /**
   * 设置主题
   */
  function setTheme(newMode: ThemeMode): void {
    mode.value = newMode
    applyTheme()
    localStorage.setItem(STORAGE_KEY_THEME, mode.value)
  }

  /**
   * 应用主题到 DOM
   */
  function applyTheme(): void {
    const root = document.documentElement
    if (mode.value === 'dark') {
      root.style.colorScheme = 'dark'
    } else {
      root.style.colorScheme = 'light'
    }
  }

  // 监听系统主题变化
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      // 如果用户没有手动设置过主题，则跟随系统
      if (!localStorage.getItem(STORAGE_KEY_THEME)) {
        mode.value = e.matches ? 'dark' : 'light'
        applyTheme()
      }
    })
  }

  return {
    // State
    mode,
    // Actions
    initTheme,
    toggleTheme,
    setTheme,
  }
})

