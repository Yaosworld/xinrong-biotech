import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true
})

/**
 * 兼容厂家复制的“标题/列表和正文在同一行”的内容，再交给 Markdown 解析器。
 */
function normalizeProductMarkdown(value: string): string {
  return value
    .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
    .replace(/\s+((?:[-*+]|\d+\.)\s+)/g, '\n$1')
}

export function renderProductDescription(value: string | null | undefined): string {
  if (!value?.trim()) return ''

  const html = marked.parse(normalizeProductMarkdown(value.trim())) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'a', 'blockquote', 'br', 'code', 'del', 'em', 'h1', 'h2', 'h3', 'h4',
      'h5', 'h6', 'hr', 'li', 'ol', 'p', 'pre', 'strong', 'table', 'tbody',
      'td', 'tfoot', 'th', 'thead', 'tr', 'ul'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'title']
  })
}
