import { ref, computed, onMounted } from 'vue'
import { usePageContentStore } from '@/stores/pageContentStore'
import type { ShowcaseContent, StatItem } from '@/types'

export function usePageShowcase(pageId: string, fallbackSlogans: string[] = []) {
  const pageContentStore = usePageContentStore()
  const showcase = ref<ShowcaseContent | null>(null)
  const loading = ref(false)

  const loadShowcase = async () => {
    loading.value = true
    try {
      const pageContent = await pageContentStore.loadPageContent(pageId)
      showcase.value = pageContent?.showcase || null
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    loadShowcase()
  })

  const slogans = computed(() => {
    if (showcase.value?.summaryLines && showcase.value.summaryLines.length > 0) {
      return showcase.value.summaryLines
    }
    return fallbackSlogans
  })

  const statsFromConfig = computed<StatItem[]>(() => {
    return showcase.value?.stats || []
  })

  return {
    slogans,
    statsFromConfig,
    showcaseLoading: loading,
    reloadShowcase: loadShowcase
  }
}

