import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

const TAB_LIST = [
  { pagePath: '/pages/home/index', text: '首页' },
  { pagePath: '/pages/school-list/index', text: '院校' },
  { pagePath: '/pages/score-analysis/index', text: '分析' },
  { pagePath: '/pages/recommend/index', text: '推荐' },
  { pagePath: '/pages/profile/index', text: '我的' },
]

// SVG Icon Components
function HomeIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : '#8e8e93'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function SchoolIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : '#8e8e93'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  )
}

function AnalysisIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : '#8e8e93'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function RecommendIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : '#8e8e93'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  )
}

function ProfileIcon({ active }: { active: boolean }) {
  const color = active ? 'var(--color-primary)' : '#8e8e93'
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  )
}

function TabIcon({ pagePath, active }: { pagePath: string; active: boolean }) {
  switch (pagePath) {
    case '/pages/home/index':
      return <HomeIcon active={active} />
    case '/pages/school-list/index':
      return <SchoolIcon active={active} />
    case '/pages/score-analysis/index':
      return <AnalysisIcon active={active} />
    case '/pages/recommend/index':
      return <RecommendIcon active={active} />
    case '/pages/profile/index':
      return <ProfileIcon active={active} />
    default:
      return null
  }
}

export default function CustomTabBar() {
  const currentPages = Taro.getCurrentPages()
  const currentPath = currentPages.length > 0
    ? `/${currentPages[currentPages.length - 1].path}`
    : ''

  const { user } = useAuth()

  const handleSwitch = (path: string) => {
    Taro.switchTab({ url: path })
  }

  return (
    <View className="custom-tabbar">
      <View className="tabbar-inner">
        {TAB_LIST.map((item) => {
          const isActive = currentPath === item.pagePath
            || (item.pagePath === '/pages/home/index' && currentPath === '/')
          return (
            <View
              key={item.pagePath}
              className={`tabbar-item ${isActive ? 'tabbar-item-active' : ''}`}
              onClick={() => handleSwitch(item.pagePath)}
            >
              <View className="tabbar-icon-wrapper">
                <TabIcon pagePath={item.pagePath} active={isActive} />
                {isActive && <View className="tabbar-active-dot" />}
              </View>
              <View className={`tabbar-text ${isActive ? 'tabbar-text-active' : ''}`}>
                {item.text}
              </View>
              {item.pagePath === '/pages/profile/index' && !user && (
                <View className="tabbar-badge" />
              )}
            </View>
          )
        })}
      </View>
      <View className="tabbar-safe-area" />
    </View>
  )
}