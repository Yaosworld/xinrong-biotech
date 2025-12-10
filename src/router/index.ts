import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  // ========================================
  // 前台路由
  // ========================================
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/HomePage.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/products',
    name: 'ProductCenter',
    component: () => import('@/views/products/ProductCenter.vue'),
    meta: { title: '产品中心' }
  },
  {
    path: '/products/:id',
    name: 'ProductDetail',
    component: () => import('@/views/products/ProductDetail.vue'),
    meta: { title: '产品详情' }
  },
  {
    path: '/brands',
    name: 'BrandCenter',
    component: () => import('@/views/brands/BrandCenter.vue'),
    meta: { title: '品牌中心' }
  },
  {
    path: '/brands/:id',
    name: 'BrandDetail',
    component: () => import('@/views/brands/BrandDetail.vue'),
    meta: { title: '品牌详情' }
  },
  {
    path: '/news',
    name: 'PromotionCenter',
    component: () => import('@/views/promotions/PromotionCenter.vue'),
    meta: { title: '促销中心' }
  },
  {
    path: '/news/promotion/:id',
    name: 'PromotionDetail',
    component: () => import('@/views/promotions/PromotionDetail.vue'),
    meta: { title: '活动详情' }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/views/about/AboutPage.vue'),
    meta: { title: '关于我们' }
  },

  // ========================================
  // 隐藏管理路由
  // ========================================
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminLayout.vue'),
    meta: {
      hidden: true,
      requiresAuth: false
    },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { title: '管理仪表板' }
      },
      // 横幅设置（统一管理所有页面的Banner）
      {
        path: 'banners',
        name: 'AdminBanners',
        component: () => import('@/views/admin/banners/BannerManagement.vue'),
        meta: { title: '横幅设置' }
      },
      // 产品管理
      {
        path: 'products/list',
        name: 'AdminProductsList',
        component: () => import('@/views/admin/products/ProductsList.vue'),
        meta: { title: '产品列表' }
      },
      // 品牌管理
      {
        path: 'brands/list',
        name: 'AdminBrandsList',
        component: () => import('@/views/admin/brands/BrandsList.vue'),
        meta: { title: '品牌列表' }
      },
      // 促销管理
      {
        path: 'promotions/list',
        name: 'AdminPromotionsList',
        component: () => import('@/views/admin/promotions/PromotionsList.vue'),
        meta: { title: '活动列表' }
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

// 路由守卫 - 设置页面标题
router.beforeEach((to, _from, next) => {
  const baseTitle = '生物科技企业官网'
  const pageTitle = to.meta.title as string
  document.title = pageTitle ? `${pageTitle} - ${baseTitle}` : baseTitle
  next()
})

export default router

