import { useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button } from 'antd-mobile'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

const features = [
  {
    key: 'target',
    title: 'AI智能推荐',
    desc: '个性化冲稳保方案',
  },
  {
    key: 'school',
    title: '3000+院校库',
    desc: '全面数据查询',
  },
  {
    key: 'chart',
    title: '多维分数分析',
    desc: '精准位次换算',
  },
]

export default function WelcomePage() {
  const { user, loading } = useAuth()

  useEffect(() => {
    // If user is already logged in, redirect to home immediately
    if (!loading && user) {
      Taro.switchTab({ url: '/pages/home/index' })
    }
  }, [user, loading])

  // Show loading spinner while checking auth status
  if (loading) {
    return (
      <View className="welcome-page">
        <View className="welcome-loading">
          <View className="loading-spinner" />
        </View>
      </View>
    )
  }

  // Don't render if user is logged in (will redirect)
  if (user) {
    return null
  }

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' })
  }

  const handleRegister = () => {
    Taro.navigateTo({ url: '/pages/register/index' })
  }

  const handleSkip = () => {
    Taro.switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className="welcome-page">
      {/* Background gradient mesh */}
      <View className="welcome-bg">
        <View className="welcome-bg-gradient" />
        <View className="welcome-bg-mesh" />
        <View className="welcome-bg-orb welcome-bg-orb-1" />
        <View className="welcome-bg-orb welcome-bg-orb-2" />
        <View className="welcome-bg-orb welcome-bg-orb-3" />
      </View>

      {/* Main content */}
      <View className="welcome-content">
        {/* Logo area */}
        <View className="welcome-logo animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <View className="logo-icon icon-graduation-cap" />
        </View>

        {/* App name and tagline */}
        <View className="welcome-header animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <Text className="welcome-title">高考志愿通</Text>
          <Text className="welcome-tagline">智能志愿填报 · 科学规划未来</Text>
        </View>

        {/* Feature highlights */}
        <View className="welcome-features animate-fade-up" style={{ animationDelay: '0.4s' }}>
          {features.map((feature, index) => (
            <View
              key={feature.key}
              className="feature-item"
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <View className={`feature-icon-wrapper icon-${feature.key}`} />
              <View className="feature-text">
                <Text className="feature-title">{feature.title}</Text>
                <Text className="feature-desc">{feature.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action buttons */}
        <View className="welcome-actions animate-fade-up" style={{ animationDelay: '0.8s' }}>
          <Button
            block
            color="primary"
            size="large"
            className="btn-login"
            onClick={handleLogin}
          >
            登录
          </Button>
          <Button
            block
            fill="none"
            size="large"
            className="btn-register"
            onClick={handleRegister}
          >
            注册
          </Button>
        </View>

        {/* Skip link */}
        <View className="welcome-skip animate-fade-up" style={{ animationDelay: '1s' }}>
          <Text className="skip-link" onClick={handleSkip}>
            跳过，直接体验
          </Text>
        </View>
      </View>
    </View>
  )
}