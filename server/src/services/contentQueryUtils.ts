import type { PaginatedResult, QueryOptions } from './contentModels'

function matchesSearch(item: Record<string, any>, query: string): boolean {
  return Object.values(item).some(value => {
    if (value === null || value === undefined) return false
    return String(value).toLowerCase().includes(query)
  })
}

export function applyListQuery<T extends Record<string, any>>(
  items: T[],
  options: QueryOptions = {}
): PaginatedResult<T> {
  const {
    page = 1,
    pageSize = 20,
    search,
    categoryId,
    brand,
    sortBy
  } = options

  let data = [...items]

  if (search) {
    const query = search.toLowerCase()
    data = data.filter(item => matchesSearch(item, query))
  }

  if (categoryId) {
    data = data.filter(item => item.categoryId === categoryId)
  }

  if (brand) {
    data = data.filter(item => item.brand === brand)
  }

  if (sortBy) {
    const [field, order] = sortBy.split('-')
    data.sort((a, b) => {
      const aVal = a[field] || ''
      const bVal = b[field] || ''
      const cmp = String(aVal).localeCompare(String(bVal), 'zh-CN')
      return order === 'desc' ? -cmp : cmp
    })
  }

  const total = data.length
  const totalPages = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize

  return {
    data: data.slice(start, start + pageSize),
    pagination: { page, pageSize, total, totalPages }
  }
}
