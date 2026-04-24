import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Taro, { getEnv } from '@tarojs/taro'
import type { AuthResponse } from '@/types'
import { authApi } from '@/api/auth'
import { AuthContext } from './AuthContextDef'

const IS_WEAPP = getEnv() === 'WEAPP'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => {
    const stored = Taro.getStorageSync('user')
    return stored ? (JSON.parse(stored) as AuthResponse) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Taro.getStorageSync('token')
    if (!token) {
      setLoading(false)
      return
    }
    let mounted = true
    const fetchUser = async (): Promise<void> => {
      try {
        const data = await authApi.me()
        if (mounted) {
          setUser(data)
          Taro.setStorageSync('user', JSON.stringify(data))
        }
      } catch {
        if (mounted) {
          Taro.removeStorageSync('token')
          Taro.removeStorageSync('user')
          setUser(null)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchUser()
    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback((data: AuthResponse) => {
    Taro.setStorageSync('token', data.token)
    Taro.setStorageSync('user', JSON.stringify(data))
    setUser(data)
  }, [])

  const logout = useCallback(() => {
    Taro.removeStorageSync('token')
    Taro.removeStorageSync('user')
    setUser(null)
  }, [])

  /**
   * 微信一键登录流程：
   * 1. 调用 Taro.login() 获取微信临时登录凭证 code
   * 2. 调用 Taro.getUserProfile() 获取用户昵称和头像（需用户授权）
   * 3. 将 code + 用户信息发送到后端 /auth/wechat-login
   * 4. 后端通过 code 换取 openid，查找或创建用户，返回 JWT token
   */
  const wechatLogin = useCallback(async (): Promise<void> => {
    if (!IS_WEAPP) {
      Taro.showToast({ title: '仅支持微信小程序登录', icon: 'none' })
      return
    }

    try {
      // Step 1: 获取微信登录凭证
      const loginRes = await Taro.login()
      if (!loginRes.code) {
        throw new Error('微信登录失败：获取 code 失败')
      }

      // Step 2: 获取用户信息（需要用户主动点击授权）
      const profileRes = await Taro.getUserProfile({
        desc: '用于完善用户资料',
      })

      const { nickName, avatarUrl } = profileRes.userInfo

      // Step 3: 发送到后端进行微信登录
      const data = await authApi.wechatLogin({
        code: loginRes.code,
        nickName,
        avatarUrl,
      })

      // Step 4: 登录成功，保存 token
      login(data)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      Taro.switchTab({ url: '/pages/home/index' })
    } catch (error) {
      if (error instanceof Error) {
        // 用户取消授权
        if (error.message?.includes('cancel') || error.message?.includes('取消')) {
          Taro.showToast({ title: '已取消授权', icon: 'none' })
          return
        }
        Taro.showToast({
          title: error.message || '微信登录失败',
          icon: 'none',
        })
      } else {
        Taro.showToast({ title: '微信登录失败', icon: 'none' })
      }
    }
  }, [login])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, wechatLogin }}>
      {children}
    </AuthContext.Provider>
  )
}