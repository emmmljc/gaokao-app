import { useEffect, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { DotLoading, Empty, Toast } from 'antd-mobile'
import { majorApi } from '@/api/major'
import type { MajorDetailResponse, School } from '@/types'
import './index.scss'

export default function MajorDetailPage() {
  const majorId = Taro.Current.router?.params?.majorId
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<MajorDetailResponse | null>(null)

  useEffect(() => {
    if (!majorId) {
      Toast.show({ content: '缺少专业ID参数', icon: 'fail' })
      setLoading(false)
      return
    }

    (async () => {
      try {
        setLoading(true)
        const data = await majorApi.detail(Number(majorId))
        setDetail(data)
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取专业详情失败'
        Toast.show({ content: text, icon: 'fail' })
      } finally {
        setLoading(false)
      }
    })()
  }, [majorId])

  const handleBack = () => {
    Taro.navigateBack()
  }

  const handleSchoolClick = (schoolId: number) => {
    Taro.navigateTo({ url: `/pages/school-detail/index?schoolId=${schoolId}` })
  }

  if (loading) {
    return (
      <View className="major-detail-loading">
        <DotLoading color="primary" />
        <Text className="major-detail-loading-text">加载中...</Text>
      </View>
    )
  }

  if (!detail) {
    return (
      <View className="major-detail-empty">
        <Empty description="未找到专业数据" />
      </View>
    )
  }

  return (
    <View className="major-detail-container">
      {/* Back Button */}
      <View className="major-detail-back" onClick={handleBack}>
        <Text className="major-detail-back-icon">←</Text>
        <Text className="major-detail-back-text">返回列表</Text>
      </View>

      {/* Major Info Card */}
      <View className="major-info-card">
        <View className="major-info-badge">
          <Text className="major-info-badge-icon">📚</Text>
          <Text className="major-info-badge-text">
            {detail.major.category || '专业详情'}
          </Text>
        </View>

        <Text className="major-info-name">{detail.major.majorName}</Text>
        <Text className="major-info-subtitle">
          {detail.major.subcategory || '综合类'}
        </Text>

        <View className="major-info-grid">
          <View className="major-info-item">
            <Text className="major-info-label">学科门类</Text>
            <Text className="major-info-value">
              {detail.major.category || '—'}
            </Text>
          </View>
          <View className="major-info-item">
            <Text className="major-info-label">专业类别</Text>
            <Text className="major-info-value">
              {detail.major.subcategory || '—'}
            </Text>
          </View>
          <View className="major-info-item">
            <Text className="major-info-label">授予学位</Text>
            <Text className="major-info-value">
              {detail.major.degree || '—'}
            </Text>
          </View>
          <View className="major-info-item">
            <Text className="major-info-label">修业年限</Text>
            <Text className="major-info-value">
              {detail.major.duration || '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Score Trends Placeholder */}
      <View className="major-chart-card">
        <Text className="major-card-title">历年录取分数趋势</Text>
        <View className="major-chart-placeholder">
          <View className="major-chart-placeholder-icon">
            <Text>📊</Text>
          </View>
          <Text className="major-chart-placeholder-title">
            图表功能暂未支持
          </Text>
          <Text className="major-chart-placeholder-desc">
            移动端图表功能正在开发中，敬请期待
          </Text>
        </View>
      </View>

      {/* Schools List */}
      <View className="major-schools-card">
        <Text className="major-card-title">开设院校</Text>

        {detail.offeredBySchools.length > 0 ? (
          <View className="major-schools-list">
            {detail.offeredBySchools.map((school: School) => (
              <View
                key={`${school.id}-${school.schoolId}`}
                className="major-school-item"
                onClick={() => handleSchoolClick(school.id)}
              >
                <View className="major-school-content">
                  <Text className="major-school-name">{school.name}</Text>
                  <View className="major-school-location">
                    <Text className="major-school-location-icon">📍</Text>
                    <Text className="major-school-location-text">
                      {school.province}
                      {school.city ? ` · ${school.city}` : ''}
                    </Text>
                  </View>
                </View>
                <View className="major-school-arrow">
                  <Text>→</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className="major-schools-empty">
            <View className="major-schools-empty-icon">
              <Text>🏫</Text>
            </View>
            <Text className="major-schools-empty-title">暂无开设院校</Text>
            <Text className="major-schools-empty-desc">
              当前数据库中暂未收录开设该专业的院校信息
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}