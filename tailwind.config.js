/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 品牌色系 - 深蓝色系（新设计）
        primary: {
          50: '#e8f4fa',
          100: '#c5e4f5',
          200: '#9fd2ef',
          300: '#6fbde6',
          400: '#43CEED',
          500: '#1a9fd4',
          600: '#0d7fb3',
          700: '#05548C',
          800: '#044370',
          900: '#033254',
        },
        // 深蓝渐变色系
        'gradient': {
          50: '#e8f8fd',
          100: '#c5eefb',
          200: '#9fe3f8',
          300: '#6fd5f3',
          400: '#43CEED',
          500: '#1ab0d6',
          600: '#0d8ab3',
          700: '#05548C',
          800: '#044370',
          900: '#033254',
        },
        // 科技蓝
        accent: {
          50: '#e6f7fc',
          100: '#cceff9',
          200: '#99dff3',
          300: '#66cfed',
          400: '#43CEED',
          500: '#1ab8d9',
          600: '#0d94b3',
          700: '#05548C',
          800: '#044370',
          900: '#033254',
        },
        // 深色背景
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },
      fontFamily: {
        sans: ['PingFang SC', 'Microsoft YaHei', 'Inter', 'system-ui', 'sans-serif'],
        display: ['PingFang SC', 'Microsoft YaHei', 'Poppins', 'sans-serif'],
      },
      backgroundImage: {
        // 蓝色渐变背景
        'gradient-showcase': 'linear-gradient(135deg, #05548C 0%, #1a9fd4 50%, #43CEED 100%)',
        'gradient-showcase-2': 'linear-gradient(135deg, #05548C 0%, #0d8ab3 50%, #43CEED 100%)',
        // 卡片图片占位背景
        'gradient-card': 'linear-gradient(135deg, #e8f4fa 0%, #c5eefb 100%)',
        'gradient-card-hover': 'linear-gradient(135deg, #c5e4f5 0%, #9fe3f8 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-slower': 'float 10s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      boxShadow: {
        'card': '0 2px 12px 0 rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 24px 0 rgba(0, 0, 0, 0.12)',
        'header': '0 2px 8px 0 rgba(0, 0, 0, 0.06)',
        'button': '0 2px 8px 0 rgba(5, 84, 140, 0.2)',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}
