import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro, { getEnv } from '@tarojs/taro'
import { Card, Form, Input, Button, Toast } from 'antd-mobile'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

const IS_WEAPP = getEnv() === 'WEAPP'

export default function LoginPage() {
  const { login, wechatLogin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [wechatLoading, setWechatLoading] = useState(false)
  const [form] = Form.useForm()

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true)
      const data = await authApi.login(values)
      login(data)
      Toast.show({
        content: '登录成功',
        icon: 'success',
      })
      Taro.switchTab({ url: '/pages/home/index' })
    } catch (error) {
      const text = error instanceof Error ? error.message : '登录失败，请检查账号密码'
      Toast.show({
        content: text,
        icon: 'fail',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWechatLogin = async () => {
    try {
      setWechatLoading(true)
      await wechatLogin()
    } catch {
      // wechatLogin 内部已处理 toast
    } finally {
      setWechatLoading(false)
    }
  }

  const goToRegister = () => {
    Taro.navigateTo({ url: '/pages/register/index' })
  }

  const goToHome = () => {
    Taro.switchTab({ url: '/pages/home/index' })
  }

  return (
    <View className="login-page">
      <View className="login-container">
        <Card className="login-card">
          <View className="login-header">
            <View className="login-title">高考志愿通</View>
            <View className="login-subtitle">登录后即可查看推荐结果与个人档案</View>
          </View>

          {/* 微信一键登录 - 仅微信小程序显示 */}
          {IS_WEAPP && (
            <View className="wechat-login-section">
              <Button
                block
                size="large"
                className="wechat-login-btn"
                loading={wechatLoading}
                onClick={handleWechatLogin}
              >
                <View className="wechat-login-btn-content">
                  <View className="wechat-icon" />
                  微信一键登录
                </View>
              </Button>
              <View className="login-divider">
                <View className="login-divider-line" />
                <View className="login-divider-text">或使用账号登录</View>
                <View className="login-divider-line" />
              </View>
            </View>
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            footer={
              <Button block type="submit" color="primary" loading={loading} size="large">
                登录
              </Button>
            }
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="请输入用户名" clearable />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input placeholder="请输入密码" type="password" clearable />
            </Form.Item>
          </Form>
          <View className="login-footer">
            <View className="login-footer-text">还没有账号？</View>
            <View className="login-footer-link" onClick={goToRegister}>
              立即注册
            </View>
          </View>
          <View className="login-home-link" onClick={goToHome}>
            返回首页
          </View>
        </Card>
      </View>
    </View>
  )
}