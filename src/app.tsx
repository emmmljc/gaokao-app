import React, { useEffect } from 'react'
import { useLaunch, getEnv } from '@tarojs/taro'
import { ConfigProvider } from 'antd-mobile'
import zhCN from 'antd-mobile/es/locales/zh-CN'
import { AuthProvider } from './contexts/AuthContext'
import { useBackButton } from './hooks/useBackButton'
import './app.scss'

function App({ children }: { children: React.ReactNode }) {
  useLaunch(() => {
    console.log('App launched.')
  })

  // Handle Android hardware back button (only for native app)
  const env = getEnv()
  if (env !== 'WEAPP') {
    useBackButton()
  }

  // 适配 Ant Design Mobile 主题
  return (
    <ConfigProvider locale={zhCN}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ConfigProvider>
  )
}

export default App
