export interface QueryOptions {
  page?: number
  pageSize?: number
  search?: string
  categoryId?: string
  brand?: string
  sortBy?: string
  status?: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface RawContentRow {
  id: number
  content_type: string
  content_key: string
  draft_data: string | null
  published_data: string | null
  status: string
  version: number
  sort_order: number
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface AdminContentItem<T = any> {
  id: number
  contentType: string
  contentKey: string
  draftData: T | null
  publishedData: T | null
  status: string
  version: number
  sortOrder: number
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  hasUnpublishedChanges: boolean
}

export interface VersionSnapshot<T = any> {
  version: number
  data: T
  changeSummary: string | null
  createdAt: string
}
