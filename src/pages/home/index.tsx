import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from 'antd-mobile'
import { useAuth } from '@/contexts/useAuthHook'
import { useSwipeTab } from '@/hooks/useSwipeTab'
import CustomTabBar from '@/custom-tab-bar'
import './index.scss'

const features = [
  {
    key: '/pages/recommend/index',
    icon: '💡',
    title: 'AI 智能推荐',
    desc: '独家冲稳保算法引擎，基于全省位次和历年录取数据，为你量身定制志愿方案',
    highlight: true,
  },
  {
    key: '/pages/school-list/index',
    icon: '🏫',
    title: '全国院校库',
    desc: '覆盖全国3000+所本专科院校，专业设置、重点学科、历年分数线一站式查询',
    highlight: false,
  },
  {
    key: '/pages/score-analysis/index',
    icon: '📊',
    title: '多维分数分析',
    desc: '同步省考试院最新一分一段表，支持等效分换算、分数线趋势动态预测',
    highlight: false,
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const swipeHandlers = useSwipeTab()

  const handleNavigate = (url: string) => {
    Taro.navigateTo({ url })
  }

  const handlePrimaryAction = () => {
    if (user) {
      Taro.navigateTo({ url: '/pages/recommend/index' })
    } else {
      Taro.navigateTo({ url: '/pages/login/index' })
    }
  }

  return (
    <View className="home-container" {...swipeHandlers}>
      {/* Hero Section */}
      <View className="hero-section">
        <View className="hero-bg-glow" />
        <View className="hero-content">
          <View className="hero-badge fade-in">
            <View className="hero-badge-dot" />
            <Text className="hero-badge-text">2025年新高考数据已同步</Text>
          </View>

          <View className="hero-title fade-in">
            <Text className="hero-title-main">精准填报志愿{'\n'}</Text>
            <Text className="hero-title-gradient text-gradient">成就理想未来</Text>
          </View>

          <Text className="hero-subtitle fade-in">
            结合 AI 大数据分析与招考政策，提供一站式院校查询、专业解析与智能推荐服务。不浪费每一分，科学规划升学路径。
          </Text>

          <View className="hero-actions fade-in">
            <Button
              color="primary"
              size="large"
              className="btn-primary-elegant"
              onClick={handlePrimaryAction}
            >
              {user ? '开始智能推荐' : '免费体验'} →
            </Button>
            <Button
              size="large"
              className="btn-secondary-elegant"
              onClick={() => handleNavigate('/pages/school-list/index')}
            >
              浏览院校
            </Button>
          </View>
        </View>
      </View>

      {/* Trust Section */}
      <View className="trust-section fade-in">
        <View className="trust-metrics">
          <View className="metric-item">
            <Text className="metric-number">3000+</Text>
            <Text className="metric-label">收录本专科院校</Text>
          </View>
          <View className="metric-item">
            <Text className="metric-number">50w+</Text>
            <Text className="metric-label">历年招录数据</Text>
          </View>
          <View className="metric-item">
            <Text className="metric-number">99%</Text>
            <Text className="metric-label">志愿推荐满意度</Text>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View className="features-section">
        <View className="features-header fade-in">
          <Text className="section-title">核心功能</Text>
          <Text className="section-subtitle">
            探索我们的智能工具，为你的高考志愿保驾护航
          </Text>
        </View>

        <View className="features-grid">
          {features.map((f) => (
            <View
              key={f.key}
              className={`feature-card ${f.highlight ? 'feature-card-highlight' : ''} fade-in`}
              onClick={() => handleNavigate(f.key)}
            >
              <View className="feature-icon-wrapper">
                <Text className="feature-icon">{f.icon}</Text>
              </View>
              <Text className="feature-title">{f.title}</Text>
              <Text className="feature-desc">{f.desc}</Text>
              <View className="feature-action">
                <Text>了解详情</Text>
                <Text className="action-icon">→</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <CustomTabBar />
    </View>
  )
}