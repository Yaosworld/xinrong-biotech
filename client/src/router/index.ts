import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 延迟导入 authStore 避免循环依赖
let authStoreInstance: any = null
async function getAuthStore() {
  if (!authStoreInstance) {
    const { useAuthStore } = await import('@/stores/authStore')
    authStoreInstance = useAuthStore()
  }
  return authStoreInstance
}

const routes: RouteRecordRaw[] = [
  // ========================================
  // 前台路由（公共页面）
  // ========================================
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/public/home/HomePage.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/products',
    name: 'ProductCenter',
    component: () => import('@/views/public/products/ProductCenter.vue'),
    meta: { title: '产品中心' }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/public/products/ProductDetail.vue'),
    meta: { title: '产品详情' }
  },
  {
    path: '/brands',
    name: 'BrandCenter',
    component: () => import('@/views/public/brands/BrandCenter.vue'),
    meta: { title: '品牌中心' }
  },
  {
    path: '/brands/:id',
    name: 'BrandDetail',
    component: () => import('@/views/public/brands/BrandDetail.vue'),
    meta: { title: '品牌详情' }
  },
  {
    path: '/news',
    name: 'PromotionCenter',
    component: () => import('@/views/public/promotions/PromotionCenter.vue'),
    meta: { title: '促销中心' }
  },
  {
    path: '/news/promotion/:id',
    name: 'PromotionDetail',
    component: () => import('@/views/public/promotions/PromotionDetail.vue'),
    meta: { title: '活动详情' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/public/about/AboutPage.vue'),
    meta: { title: '关于我们' }
  },

  // ========================================
  // 登录页面
  // ========================================
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: () => import('@/views/auth/LoginPage.vue'),
    meta: { 
      title: '管理员登录',
      guest: true
    }
  },

  // ========================================
  // 后台管理路由（需要登录）
  // ========================================
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: {
      hidden: true,
      requiresAuth: true
    },
    redirect: '/admin/products/list',
    children: [
      // 首页设置
      {
        path: 'home/settings',
        name: 'AdminHomeSettings',
        component: () => import('@/views/admin/home/HomeSettings.vue'),
        meta: { title: '首页设置' }
      },
      // 首页图片库
      {
        path: 'home/images',
        name: 'AdminHomeImages',
        component: () => import('@/views/admin/home/HomeImageList.vue'),
        meta: { title: '首页图片库' }
      },
      // 横幅设置（统一管理所有页面的Banner标语）
      {
        path: 'banners',
        name: 'AdminBanners',
        component: () => import('@/views/admin/banners/BannerManagement.vue'),
        meta: { title: '横幅标语' }
      },
      // 产品管理
      {
        path: 'products/list',
        name: 'AdminProductsList',
        component: () => import('@/views/admin/products/ProductsList.vue'),
        meta: { title: '产品列表' }
      },
      // 分类管理（新版）
      {
        path: 'products/categories',
        name: 'AdminCategoryList',
        component: () => import('@/views/admin/products/CategoryList.vue'),
        meta: { title: '分类管理' }
      },
      // 分类图片库
      {
        path: 'products/category-images',
        name: 'AdminCategoryImages',
        component: () => import('@/views/admin/products/CategoryImageList.vue'),
        meta: { title: '分类图片库' }
      },
      // 品牌管理
      {
        path: 'brands/list',
        name: 'AdminBrandsList',
        component: () => import('@/views/admin/brands/BrandsList.vue'),
        meta: { title: '品牌列表' }
      },
      // 品牌图片库
      {
        path: 'brands/images',
        name: 'AdminBrandImages',
        component: () => import('@/views/admin/brands/BrandImageList.vue'),
        meta: { title: '品牌图片库' }
      },
      // 促销管理
      {
        path: 'promotions/list',
        name: 'AdminPromotionsList',
        component: () => import('@/views/admin/promotions/PromotionsList.vue'),
        meta: { title: '活动列表' }
      },
      // 促销图片库
      {
        path: 'promotions/images',
        name: 'AdminPromotionImages',
        component: () => import('@/views/admin/promotions/PromotionImageList.vue'),
        meta: { title: '活动图片库' }
      },
      // 关于我们
      {
        path: 'about/content',
        name: 'AdminAboutContent',
        component: () => import('@/views/admin/about/AboutContent.vue'),
        meta: { title: '关于我们 - 内容管理' }
      },
      // 网站设置
      {
        path: 'site/settings',
        name: 'AdminSiteSettings',
        component: () => import('@/views/admin/site/SiteSettings.vue'),
        meta: { title: '网站设置' }
      },
      // 账号管理（仅超级管理员）
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/views/admin/users/UserManagement.vue'),
        meta: { 
          title: '账号管理',
          requiresSuperAdmin: true
        }
      },
      {
        path: 'users/avatars',
        name: 'AdminAvatars',
        component: () => import('@/views/admin/users/AvatarImageList.vue'),
        meta: { 
          title: '头像图片库',
          requiresSuperAdmin: true
        }
      }
    ]
  },

  // 测试页面
  {
    path: '/test/navigation',
    name: 'NavigationTest',
    component: () => import('@/views/test/NavigationTest.vue'),
    meta: { title: '导航状态测试', hidden: true }
  },
  {
    path: '/test/styles',
    name: 'StyleComparisonTest',
    component: () => import('@/views/test/StyleComparisonTest.vue'),
    meta: { title: '导航样式对比测试', hidden: true }
  },

  // 404 页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFound.vue'),
    meta: { title: '页面未找到' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  }
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = await getAuthStore()
  
  // 初始化认证状态
  if (!authStore.initialized) {
    await authStore.init()
  }
  
  // 设置页面标题
  const baseTitle = '生物科技企业官网'
  const pageTitle = to.meta.title as string
  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle
  
  // 检查是否需要登录
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({
      path: '/admin/login',
      query: { redirect: to.fullPath }
    })
  }
  
  // 检查是否需要超级管理员权限
  if (to.meta.requiresSuperAdmin && !authStore.isSuperAdmin) {
    return next('/admin')
  }
  
  // 已登录用户访问登录页，重定向到后台
  if (to.meta.guest && authStore.isLoggedIn) {
    return next('/admin')
  }
  
  next()
})

export default router

