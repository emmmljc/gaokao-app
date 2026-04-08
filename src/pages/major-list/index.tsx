import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { SearchBar, Picker, DotLoading, Empty, Toast } from 'antd-mobile'
import { majorApi } from '@/api/major'
import type { Major } from '@/types'
import './index.scss'

export default function MajorListPage() {
  const [loading, setLoading] = useState(false)
  const [majors, setMajors] = useState<Major[]>([])
  const [keyword, setKeyword] = useState('')
  const [category, setCategory] = useState<string | undefined>()
  const [pickerVisible, setPickerVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await majorApi.list({ keyword, category })
        setMajors(data)
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取专业列表失败'
        Toast.show({ content: text, icon: 'fail' })
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword, category])

  const categories = useMemo(
    () => Array.from(new Set(majors.map((item) => item.category).filter(Boolean))),
    [majors]
  )

  const categoryOptions = useMemo(
    () => [
      { label: '所有类别', value: '' },
      ...categories.map((item) => ({ label: item, value: item })),
    ],
    [categories]
  )

  const handleMajorClick = (majorId: number) => {
    Taro.navigateTo({ url: `/pages/major-detail/index?majorId=${majorId}` })
  }

  const handleCategoryChange = (value: string[]) => {
    const selected = value[0]
    setCategory(selected === '' ? undefined : selected)
    setPickerVisible(false)
  }

  return (
    <View className="major-page-container">
      {/* Header */}
      <View className="major-header">
        <Text className="major-title">探索专业</Text>
        <Text className="major-subtitle">浏览学术专业，找到符合您志向的学习领域</Text>
      </View>

      {/* Search Section */}
      <View className="major-search-container">
        <View className="major-search-card">
          <SearchBar
            placeholder="搜索专业名称..."
            value={keyword}
            onChange={setKeyword}
            className="major-search-bar"
          />
          <View className="major-filter-row">
            <View
              className="major-filter-btn"
              onClick={() => setPickerVisible(true)}
            >
              <Text className="major-filter-label">
                {category || '所有类别'}
              </Text>
              <Text className="major-filter-arrow">▼</Text>
            </View>
            {category && (
              <View
                className="major-filter-clear"
                onClick={() => setCategory(undefined)}
              >
                <Text className="major-filter-clear-text">清除</Text>
              </View>
            )}
          </View>
        </View>

        <Picker
          visible={pickerVisible}
          columns={[categoryOptions]}
          value={[category || '']}
          onConfirm={handleCategoryChange}
          onCancel={() => setPickerVisible(false)}
        />
      </View>

      {/* Major List */}
      <View className="major-list-container">
        {loading ? (
          <View className="major-loading">
            <DotLoading color="primary" />
            <Text className="major-loading-text">加载中...</Text>
          </View>
        ) : majors.length === 0 ? (
          <View className="major-empty-container">
            <Empty description="没有找到符合条件的专业" />
            <Text className="major-empty-tip">请尝试调整搜索词或筛选条件</Text>
          </View>
        ) : (
          <View className="major-list">
            {majors.map((major) => (
              <View
                key={major.id}
                className="major-card"
                onClick={() => handleMajorClick(major.id)}
              >
                <View className="major-card-content">
                  <View className="major-card-title-group">
                    <Text className="major-card-title">{major.majorName}</Text>
                    <Text className="major-card-subtitle">
                      {major.subcategory || '—'}
                    </Text>
                  </View>

                  <View className="major-card-category">
                    {major.category || '未分类'}
                  </View>

                  <View className="major-card-footer">
                    <View className="major-card-meta">
                      <Text>{major.degree || '暂无'}</Text>
                    </View>
                    <View className="major-card-meta">
                      <Text>{major.duration || '暂无'}</Text>
                    </View>
                  </View>
                </View>

                <View className="major-card-arrow">
                  <Text>→</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}