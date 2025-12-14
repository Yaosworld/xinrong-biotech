/**
 * 图片懒加载指令
 * 
 * 使用 Intersection Observer API 实现图片懒加载
 * 
 * 用法：
 * <img v-lazy="imageUrl" />
 */
import type { Directive, DirectiveBinding } from 'vue'

// 默认占位图
const DEFAULT_PLACEHOLDER = '/images/common/placeholder.png'

// 加载中的占位图（可选）
const LOADING_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f5f5f5" width="100" height="100"/%3E%3C/svg%3E'

// 观察器实例
let observer: IntersectionObserver | null = null

// 初始化观察器
function initObserver() {
  if (observer) return observer
  
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          const src = img.dataset.src
          
          if (src) {
            // 预加载图片
            const tempImg = new Image()
            tempImg.onload = () => {
              img.src = src
              img.classList.add('lazy-loaded')
              img.classList.remove('lazy-loading')
            }
            tempImg.onerror = () => {
              img.src = DEFAULT_PLACEHOLDER
              img.classList.add('lazy-error')
              img.classList.remove('lazy-loading')
            }
            tempImg.src = src
          }
          
          // 停止观察
          observer?.unobserve(img)
        }
      })
    },
    {
      rootMargin: '50px 0px', // 提前 50px 开始加载
      threshold: 0.01
    }
  )
  
  return observer
}

// 懒加载指令
export const vLazy: Directive<HTMLImageElement, string> = {
  mounted(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const src = binding.value
    
    if (!src) {
      el.src = DEFAULT_PLACEHOLDER
      return
    }
    
    // 设置占位图
    el.src = LOADING_PLACEHOLDER
    el.dataset.src = src
    el.classList.add('lazy-loading')
    
    // 开始观察
    const obs = initObserver()
    obs.observe(el)
  },
  
  updated(el: HTMLImageElement, binding: DirectiveBinding<string>) {
    const newSrc = binding.value
    const oldSrc = el.dataset.src
    
    if (newSrc !== oldSrc) {
      el.dataset.src = newSrc
      el.classList.remove('lazy-loaded', 'lazy-error')
      el.classList.add('lazy-loading')
      
      // 重新观察
      const obs = initObserver()
      obs.observe(el)
    }
  },
  
  unmounted(el: HTMLImageElement) {
    observer?.unobserve(el)
  }
}

// 导出安装函数
export function setupLazyLoad(app: any) {
  app.directive('lazy', vLazy)
}
