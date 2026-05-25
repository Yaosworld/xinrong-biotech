import { applyListQuery } from './contentQueryUtils'
import type { QueryOptions } from './contentModels'
import { versionedContentRepository } from './versionedContentRepository'

function parsePublishedData(contentType: string): any[] {
  return versionedContentRepository.listPublishedRows(contentType).map(row => JSON.parse(row.published_data!))
}

function getFilterOptions(contentType: string) {
  const rows = versionedContentRepository.listPublishedRows(contentType)
  const brands = new Set<string>()
  const categories = new Set<string>()

  rows.forEach(row => {
    const data = JSON.parse(row.published_data || '{}')
    if (data.brand) brands.add(data.brand)
    if (data.categoryId) categories.add(data.categoryId)
  })

  return {
    brands: Array.from(brands).sort((a, b) => a.localeCompare(b, 'zh-CN')),
    categories: Array.from(categories).sort(),
    total: rows.length
  }
}

export const cmsContentService = {
  getPublishedList(contentType: string, options: QueryOptions = {}) {
    return applyListQuery(parsePublishedData(contentType), options)
  },

  getPublishedOne<T = any>(contentType: string, contentKey: string): T | null {
    return versionedContentRepository.getAdminItem<T>(contentType, contentKey)?.publishedData || null
  },

  getAdminList(contentType: string, options: QueryOptions = {}) {
    return versionedContentRepository.getAdminList(contentType, options)
  },

  getOne(contentType: string, contentKey: string) {
    return versionedContentRepository.getAdminItem(contentType, contentKey)
  },

  getFilterOptions,

  getVersions(contentType: string, contentKey: string) {
    return versionedContentRepository.getVersions(contentType, contentKey)
  },

  saveDraft(contentType: string, contentKey: string, data: any) {
    versionedContentRepository.saveDraft(contentType, contentKey, data)
  },

  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    versionedContentRepository.batchSaveDraft(contentType, items)
  },

  delete(contentType: string, contentKey: string) {
    versionedContentRepository.softDelete(contentType, contentKey)
  },

  batchDelete(contentType: string, contentKeys: string[]) {
    return versionedContentRepository.batchSoftDelete(contentType, contentKeys)
  },

  publish(contentType: string, contentKey: string, changeSummary?: string) {
    return versionedContentRepository.publish(contentType, contentKey, changeSummary)
  },

  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string) {
    return versionedContentRepository.batchPublish(contentType, contentKeys, changeSummary)
  },

  rollback(contentType: string, contentKey: string, version: number) {
    versionedContentRepository.rollback(contentType, contentKey, version)
  }
}
