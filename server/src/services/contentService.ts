import { catalogContentService } from './catalogContentService'
import { cmsContentService } from './cmsContentService'
import type { QueryOptions } from './contentModels'

function getDomainService(contentType: string) {
  return catalogContentService.supports(contentType)
    ? catalogContentService
    : cmsContentService
}

export type { QueryOptions } from './contentModels'

export const contentService = {
  getPublishedList(contentType: string, options: QueryOptions = {}) {
    return getDomainService(contentType).getPublishedList(contentType, options)
  },

  getPublishedOne(contentType: string, contentKey: string) {
    const domainService = getDomainService(contentType)

    if (typeof domainService.getPublishedOne === 'function') {
      return domainService.getPublishedOne(contentType, contentKey)
    }

    return domainService.getOne(contentType, contentKey)?.publishedData || null
  },

  getAdminList(contentType: string, options: QueryOptions = {}) {
    return getDomainService(contentType).getAdminList(contentType, options)
  },

  getOne(contentType: string, contentKey: string) {
    return getDomainService(contentType).getOne(contentType, contentKey)
  },

  getFilterOptions(contentType: string) {
    return getDomainService(contentType).getFilterOptions(contentType)
  },

  getVersions(contentType: string, contentKey: string) {
    return getDomainService(contentType).getVersions(contentType, contentKey)
  },

  saveDraft(contentType: string, contentKey: string, data: any) {
    return getDomainService(contentType).saveDraft(contentType, contentKey, data)
  },

  batchSaveDraft(contentType: string, items: { key: string; data: any }[]) {
    return getDomainService(contentType).batchSaveDraft(contentType, items)
  },

  delete(contentType: string, contentKey: string) {
    return getDomainService(contentType).delete(contentType, contentKey)
  },

  batchDelete(contentType: string, contentKeys: string[]) {
    return getDomainService(contentType).batchDelete(contentType, contentKeys)
  },

  publish(contentType: string, contentKey: string, changeSummary?: string) {
    return getDomainService(contentType).publish(contentType, contentKey, changeSummary)
  },

  batchPublish(contentType: string, contentKeys: string[], changeSummary?: string) {
    return getDomainService(contentType).batchPublish(contentType, contentKeys, changeSummary)
  },

  rollback(contentType: string, contentKey: string, version: number) {
    return getDomainService(contentType).rollback(contentType, contentKey, version)
  }
}
