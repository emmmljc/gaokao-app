import { useState } from 'react'
import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card, Form, Input, Button, Toast } from 'antd-mobile'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

interface RegisterFormValues {
  username: string
  password: string
  confirmPassword: string
  phone?: string
  email?: string
}

export default function RegisterPage() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true)
      const { confirmPassword, ...payload } = values
      const data = await authApi.register(payload)
      login(data)
      Toast.show({
        content: '注册成功',
        icon: 'success',
      })
      Taro.switchTab({ url: '/pages/home/index' })
    } catch (error) {
      const text = error instanceof Error ? error.message : '注册失败，请检查输入信息'
      Toast.show({
        content: text,
        icon: 'fail',
      })
    } finally {
      setLoading(false)
    }
  }

  const goToLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' })
  }

  return (
    <View className="register-page">
      <View className="register-container">
        <Card className="register-card">
          <View className="register-header">
            <View className="register-title">注册账号</View>
            <View className="register-subtitle">创建账号后即可体验完整志愿推荐功能</View>
          </View>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            footer={
              <Button block type="submit" color="primary" loading={loading} size="large">
                注册
              </Button>
            }
          >
            <Form.Item
              label="用户名"
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 4, message: '用户名长度需为4-20位' },
              ]}
            >
              <Input placeholder="请输入用户名" clearable />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码长度需为6-32位' },
              ]}
            >
              <Input placeholder="请输入密码" type="password" clearable />
            </Form.Item>
            <Form.Item
              label="确认密码"
              name="confirmPassword"
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input placeholder="请再次输入密码" type="password" clearable />
            </Form.Item>
            <Form.Item label="手机号" name="phone">
              <Input placeholder="选填" clearable />
            </Form.Item>
            <Form.Item
              label="邮箱"
              name="email"
              rules={[{ type: 'email', message: '邮箱格式不正确' }]}
            >
              <Input placeholder="选填" clearable />
            </Form.Item>
          </Form>
          <View className="register-footer">
            <View className="register-footer-text">已有账号？</View>
            <View className="register-footer-link" onClick={goToLogin}>
              立即登录
            </View>
          </View>
        </Card>
      </View>
    </View>
  )
}