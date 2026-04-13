import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { PullToRefresh } from 'antd-mobile'
import { useAuth } from '@/contexts/useAuthHook'
import { useSwipeTab } from '@/hooks/useSwipeTab'
import CustomTabBar from '@/custom-tab-bar'
import OverflowMenu from '@/components/OverflowMenu'
import './index.scss'

// Quick entry items for the 2x3 grid
const quickEntries = [
  {
    key: 'school',
    icon: '🏫',
    title: '院校查询',
    path: '/pages/school-list/index',
    isTab: true,
  },
  {
    key: 'major',
    icon: '📚',
    title: '专业分析',
    path: '/pages/major-compare/index',
    isTab: true,
  },
  {
    key: 'score',
    icon: '📊',
    title: '分数分析',
    path: '/pages/score-analysis/index',
    isTab: true,
  },
  {
    key: 'ai',
    icon: '💡',
    title: 'AI推荐',
    path: '/pages/recommend/index',
    isTab: true,
  },
  {
    key: 'chat',
    icon: '🤖',
    title: '智能填表',
    path: '/pages/chat/index',
    isTab: false,
  },
  {
    key: 'profile',
    icon: '👤',
    title: '个人档案',
    path: '/pages/profile/index',
    isTab: true,
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const swipeHandlers = useSwipeTab()

  const handleNavigate = (path: string, isTab: boolean) => {
    if (isTab) {
      Taro.switchTab({ url: path })
    } else {
      Taro.navigateTo({ url: path })
    }
  }

  const handlePrimaryAction = () => {
    if (user) {
      Taro.switchTab({ url: '/pages/recommend/index' })
    } else {
      Taro.navigateTo({ url: '/pages/login/index' })
    }
  }

  return (
    <View className="home-container" {...swipeHandlers}>
      <View className="home-top-bar">
        <Text className="home-top-bar-title">高考志愿通</Text>
        <OverflowMenu />
      </View>
      <PullToRefresh
        onRefresh={async () => {
          await Taro.getCurrentPages()
        }}
      >
        {/* Hero Section - Compact */}
        <View className="hero-section">
          <View className="hero-content">
            <Text className="hero-title">精准填报志愿</Text>
            <Text className="hero-title-gradient">成就理想未来</Text>

            <View className="hero-cta" onClick={handlePrimaryAction}>
              <View className="hero-btn">
                智能志愿填报
              </View>
            </View>
          </View>
        </View>

        {/* Trust Strip */}
        <View className="trust-strip">
          <Text className="trust-item">3000+ 院校</Text>
          <Text className="trust-dot">·</Text>
          <Text className="trust-item">50万+ 数据</Text>
          <Text className="trust-dot">·</Text>
          <Text className="trust-item">99% 满意度</Text>
        </View>

        {/* Quick Entry Grid */}
        <View className="quick-entry-section">
          <View className="quick-entry-grid">
            {quickEntries.map((entry) => (
              <View
                key={entry.key}
                className="quick-entry-item"
                onClick={() => handleNavigate(entry.path, entry.isTab)}
              >
                <View className="quick-entry-icon">
                  <Text>{entry.icon}</Text>
                </View>
                <Text className="quick-entry-label">{entry.title}</Text>
              </View>
            ))}
          </View>
        </View>
      </PullToRefresh>

      <CustomTabBar />
    </View>
  )
}