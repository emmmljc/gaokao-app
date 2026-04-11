import { useEffect, useRef } from 'react'
import Taro from '@tarojs/taro'

// Tab pages that should not navigate back (they're the root)
const TAB_PAGES = [
  '/pages/home/index',
  '/pages/school-list/index',
  '/pages/score-analysis/index',
  '/pages/recommend/index',
  '/pages/profile/index',
]

/**
 * Access Capacitor App plugin via the global Capacitor object.
 * This avoids a static import that Webpack tries to resolve at build time,
 * which would fail because @capacitor/app is not installed in this project's
 * node_modules (it's only in the Capacitor wrapper project).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCapacitorAppPlugin(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cap = (window as any).Capacitor
    if (!cap?.Plugins?.App) return null
    return cap.Plugins.App
  } catch {
    return null
  }
}

/**
 * Hook for handling Android hardware back button via Capacitor.
 * - If there are pages in the navigation stack, navigate back
 * - If on a tab page with no stack history, double-press to exit
 * - Falls back gracefully in non-Capacitor environments (H5 browser)
 */
export function useBackButton() {
  const lastBackPressRef = useRef<number>(0)
  const exitThreshold = 2000

  useEffect(() => {
    const AppPlugin = getCapacitorAppPlugin()
    if (!AppPlugin) return

    const handler = AppPlugin.addListener('backButton', () => {
      const currentPages = Taro.getCurrentPages()
      const currentPage = currentPages[currentPages.length - 1]
      const currentPath = currentPage ? `/${currentPage.path}` : ''

      const isTabPage = TAB_PAGES.some(tab => tab === currentPath || currentPath.startsWith(tab.replace('/index', '')))

      if (currentPages.length > 1) {
        Taro.navigateBack()
      } else if (isTabPage) {
        const now = Date.now()
        if (now - lastBackPressRef.current < exitThreshold) {
          // Double press — exit the app
          if (AppPlugin.exitApp) {
            AppPlugin.exitApp()
          }
        } else {
          lastBackPressRef.current = now
          Taro.showToast({
            title: '再按一次退出应用',
            icon: 'none',
            duration: 2000,
          })
        }
      } else {
        Taro.switchTab({ url: '/pages/home/index' })
      }
    })

    return () => {
      if (handler && typeof handler.remove === 'function') {
        handler.remove()
      }
    }
  }, [])
}