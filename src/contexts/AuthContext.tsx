import { useState, useEffect, useCallback, type ReactNode } from 'react'
import Taro from '@tarojs/taro'
import type { AuthResponse } from '@/types'
import { authApi } from '@/api/auth'
import { AuthContext } from './AuthContextDef'

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

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
