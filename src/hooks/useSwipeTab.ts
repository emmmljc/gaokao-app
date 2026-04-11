import { useCallback, useRef } from 'react'
import Taro from '@tarojs/taro'

const TABS = [
  '/pages/home/index',
  '/pages/school-list/index',
  '/pages/score-analysis/index',
  '/pages/recommend/index',
  '/pages/profile/index',
]

const SWIPE_THRESHOLD = 60

interface TouchHandlers {
  onTouchStart: (e: any) => void
  onTouchMove: (e: any) => void
  onTouchEnd: (e: any) => void
}

export function useSwipeTab(): TouchHandlers {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: any) => {
    const touch = e.touches?.[0]
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }
  }, [])

  const onTouchMove = useCallback(() => {
    // No-op, just need to track movement
  }, [])

  const onTouchEnd = useCallback((e: any) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches?.[0]
    if (!touch) return

    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    // Reset touch start
    touchStartRef.current = null

    // Check if horizontal swipe (|deltaX| > threshold and |deltaX| > |deltaY| * 1.5)
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaX < SWIPE_THRESHOLD) return
    if (absDeltaX <= absDeltaY * 1.5) return

    // Get current tab index
    const currentPages = Taro.getCurrentPages()
    const currentPath = currentPages.length > 0
      ? `/${currentPages[currentPages.length - 1].path}`
      : ''

    let currentIndex = TABS.findIndex(tab => tab === currentPath)
    
    // Handle root path as home
    if (currentPath === '/' || currentIndex === -1) {
      currentIndex = 0
    }

    let nextIndex: number

    if (deltaX < 0) {
      // Swipe left -> next tab
      nextIndex = Math.min(currentIndex + 1, TABS.length - 1)
    } else {
      // Swipe right -> previous tab
      nextIndex = Math.max(currentIndex - 1, 0)
    }

    // Only switch if index changed
    if (nextIndex !== currentIndex) {
      Taro.switchTab({ url: TABS[nextIndex] })
    }
  }, [])

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}