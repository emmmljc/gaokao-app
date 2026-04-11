import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { SearchBar, Tag, Button, Empty, DotLoading, Picker, Popup } from 'antd-mobile'
import { schoolApi } from '@/api/school'
import type { School } from '@/types'
import { useSwipeTab } from '@/hooks/useSwipeTab'
import CustomTabBar from '@/custom-tab-bar'
import './index.scss'

const PROVINCES = ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆']
const SCHOOL_TYPES = ['综合', '理工', '师范', '医药', '财经', '政法', '农林', '艺术', '体育', '民族', '军事', '语言']

export default function SchoolListPage() {
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [keyword, setKeyword] = useState('')
  const [province, setProvince] = useState<string>()
  const [schoolType, setSchoolType] = useState<string>()

  // Filter states
  const [showFilters, setShowFilters] = useState(false)
  const [tag985, setTag985] = useState(false)
  const [tag211, setTag211] = useState(false)
  const [doubleFirst, setDoubleFirst] = useState(false)

  // Picker popup states
  const [provincePickerVisible, setProvincePickerVisible] = useState(false)
  const [schoolTypePickerVisible, setSchoolTypePickerVisible] = useState(false)

  const swipeHandlers = useSwipeTab()

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setLoading(true)
        const data = await schoolApi.list({ keyword, province, schoolType })
        setSchools(data)
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取院校列表失败'
        Taro.showToast({ title: text, icon: 'error' })
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [keyword, province, schoolType])

  const filteredSchools = useMemo(() => {
    return schools.filter(school => {
      if (tag985 && school.is985 !== 1) return false
      if (tag211 && school.is211 !== 1) return false
      if (doubleFirst && school.isDoubleFirst !== 1) return false
      return true
    })
  }, [schools, tag985, tag211, doubleFirst])

  const handleSchoolClick = (schoolId: string) => {
    Taro.navigateTo({ url: `/pages/school-detail/index?schoolId=${schoolId}` })
  }

  const clearFilters = () => {
    setKeyword('')
    setProvince(undefined)
    setSchoolType(undefined)
    setTag985(false)
    setTag211(false)
    setDoubleFirst(false)
  }

  const hasFilters = keyword || province || schoolType || tag985 || tag211 || doubleFirst

  return (
    <View className="school-list-page" {...swipeHandlers}>
      {/* Search Section */}
      <View className="search-section">
        <SearchBar
          value={keyword}
          onChange={setKeyword}
          placeholder="搜索院校名称..."
          clearable
          className="search-bar"
        />
        <Button
          color={showFilters || hasFilters ? 'primary' : 'default'}
          size="small"
          className="filter-btn"
          onClick={() => setShowFilters(!showFilters)}
        >
          筛选
        </Button>
      </View>

      {/* Filter Section */}
      {showFilters && (
        <View className="filter-section">
          <View className="filter-row">
            <View className="filter-item">
              <Text className="filter-label">所在地区</Text>
              <View
                className="filter-picker-trigger"
                onClick={() => setProvincePickerVisible(true)}
              >
                <Text className="filter-picker-value">
                  {province || '不限'}
                </Text>
                <Text className="filter-picker-arrow">▼</Text>
              </View>
              <Popup
                visible={provincePickerVisible}
                onMaskClick={() => setProvincePickerVisible(false)}
                bodyStyle={{ height: '40vh' }}
              >
                <Picker
                  columns={[PROVINCES.map(p => ({ label: p, value: p }))]}
                  value={province ? [province] : undefined}
                  onConfirm={(val) => {
                    setProvince(val?.[0] as string)
                    setProvincePickerVisible(false)
                  }}
                  onCancel={() => setProvincePickerVisible(false)}
                />
              </Popup>
            </View>

            <View className="filter-item">
              <Text className="filter-label">院校类型</Text>
              <View
                className="filter-picker-trigger"
                onClick={() => setSchoolTypePickerVisible(true)}
              >
                <Text className="filter-picker-value">
                  {schoolType || '不限'}
                </Text>
                <Text className="filter-picker-arrow">▼</Text>
              </View>
              <Popup
                visible={schoolTypePickerVisible}
                onMaskClick={() => setSchoolTypePickerVisible(false)}
                bodyStyle={{ height: '40vh' }}
              >
                <Picker
                  columns={[SCHOOL_TYPES.map(t => ({ label: t, value: t }))]}
                  value={schoolType ? [schoolType] : undefined}
                  onConfirm={(val) => {
                    setSchoolType(val?.[0] as string)
                    setSchoolTypePickerVisible(false)
                  }}
                  onCancel={() => setSchoolTypePickerVisible(false)}
                />
              </Popup>
            </View>
          </View>

          <View className="filter-row">
            <Text className="filter-label">办学层次</Text>
            <View className="tag-filter-group">
              <Tag
                color={tag985 ? 'primary' : 'default'}
                className="filter-tag"
                onClick={() => setTag985(!tag985)}
              >
                {tag985 ? '✓ 985' : '985'}
              </Tag>
              <Tag
                color={tag211 ? 'primary' : 'default'}
                className="filter-tag"
                onClick={() => setTag211(!tag211)}
              >
                {tag211 ? '✓ 211' : '211'}
              </Tag>
              <Tag
                color={doubleFirst ? 'primary' : 'default'}
                className="filter-tag"
                onClick={() => setDoubleFirst(!doubleFirst)}
              >
                {doubleFirst ? '✓ 双一流' : '双一流'}
              </Tag>
            </View>
          </View>
        </View>
      )}

      {/* Results Section */}
      <View className="results-section">
        {loading ? (
          <View className="loading-container">
            <DotLoading color="primary" />
            <Text className="loading-text">加载中...</Text>
          </View>
        ) : filteredSchools.length === 0 ? (
          <View className="empty-container">
            <Empty description="没有找到相关院校" />
            {hasFilters && (
              <Button color="primary" fill="outline" size="small" onClick={clearFilters}>
                清除筛选条件
              </Button>
            )}
          </View>
        ) : (
          <>
            <Text className="results-count">共 {filteredSchools.length} 个结果</Text>
            <View className="school-list">
              {filteredSchools.map((school) => (
                <View
                  key={school.id}
                  className="school-card"
                  onClick={() => handleSchoolClick(school.schoolId)}
                >
                  <View className="school-card-header">
                    <View className="school-avatar">
                      <Text className="school-avatar-text">{school.name.charAt(0)}</Text>
                    </View>
                    <View className="school-tags">
                      {school.is985 === 1 && (
                        <Tag color="danger" className="school-tag">985</Tag>
                      )}
                      {school.is211 === 1 && (
                        <Tag color="primary" className="school-tag">211</Tag>
                      )}
                      {school.isDoubleFirst === 1 && (
                        <Tag color="success" className="school-tag">双一流</Tag>
                      )}
                    </View>
                  </View>

                  <Text className="school-name">{school.name}</Text>

                  <View className="school-info">
                    <Text className="school-location">
                      {school.province}{school.city ? ` · ${school.city}` : ''}
                    </Text>
                    <Text className="school-divider">|</Text>
                    <Text className="school-type">{school.schoolType || '综合'}</Text>
                  </View>

                  {school.tags && (
                    <View className="school-extra-tags">
                      {school.tags.split(/[,，\s]+/).filter(Boolean).slice(0, 3).map((tag) => (
                        <View key={tag} className="extra-tag">
                          <Text className="extra-tag-text">{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </View>
      <CustomTabBar />
    </View>
  )
}