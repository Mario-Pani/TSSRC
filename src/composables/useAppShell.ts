import { computed, ref, watch } from 'vue'
import { APP_COPY, LANGUAGE_OPTIONS } from '../appCopy'
import type { LanguageCode, ThemeMode } from '../types'

const STORAGE_KEY = 'app-language'
const THEME_STORAGE_KEY = 'app-theme'

export function useAppShell() {
  const language = ref<LanguageCode>((localStorage.getItem(STORAGE_KEY) as LanguageCode) || 'US')
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = ref<ThemeMode>((localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || (prefersDark ? 'dark' : 'light'))
  const t = computed(() => APP_COPY[language.value])
  const languageOptions = LANGUAGE_OPTIONS
  const activeTab = ref(APP_COPY[language.value].nav[0])

  function selectTab(tab: string) {
    activeTab.value = tab
  }

  function applyTheme(mode: ThemeMode) {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', mode)
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  applyTheme(theme.value)

  watch(language, (value) => {
    localStorage.setItem(STORAGE_KEY, value)
    if (!APP_COPY[value].nav.includes(activeTab.value)) {
      activeTab.value = APP_COPY[value].nav[0]
    }
  })

  watch(theme, (value) => {
    localStorage.setItem(THEME_STORAGE_KEY, value)
    applyTheme(value)
  })

  return {
    language,
    theme,
    t,
    languageOptions,
    activeTab,
    selectTab,
    toggleTheme,
  }
}