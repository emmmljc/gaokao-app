import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card, Form, Input, Button, Toast } from 'antd-mobile'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

export default function LoginPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
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

  const goToRegister = () => {
    Taro.navigateTo({ url: '/pages/register/index' })
  }

  return (
    <View className="login-page">
      <View className="login-container">
        <Card className="login-card">
          <View className="login-header">
            <View className="login-title">高考志愿通</View>
            <View className="login-subtitle">登录后即可查看推荐结果与个人档案</View>
          </View>
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
        </Card>
      </View>
    </View>
  )
}