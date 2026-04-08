import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Tag, Tabs, DotLoading, Button, CapsuleTabs } from 'antd-mobile'
import { schoolApi } from '@/api/school'
import type { MajorGroup, SchoolDetailResponse, SchoolScore } from '@/types'
import './index.scss'

type SubjectCategoryKey = 'physics' | 'history'

interface SubjectTheme {
  key: SubjectCategoryKey
  label: string
  aliases: string[]
  accent: string
}

interface MajorGroupEntry {
  group: MajorGroup
  majors: string[]
}

const SUBJECT_THEMES: Record<SubjectCategoryKey, SubjectTheme> = {
  physics: {
    key: 'physics',
    label: '物理类',
    aliases: ['物理类', '理科', 'physics', 'phy'],
    accent: '#4f46e5',
  },
  history: {
    key: 'history',
    label: '历史类',
    aliases: ['历史类', '文科', 'history', 'his'],
    accent: '#b45309',
  },
}

function normalizeSubjectType(subjectType: string | undefined | null): SubjectCategoryKey | null {
  const normalized = subjectType?.trim().toLowerCase()
  if (!normalized) return null
  return Object.values(SUBJECT_THEMES).find((theme) =>
    theme.aliases.some((alias) => normalized.includes(alias.toLowerCase()))
  )?.key ?? null
}

function getTrendSummaryByYear(scoreTrends: SchoolScore[]): Record<number, SchoolScore> {
  return scoreTrends.reduce<Record<number, SchoolScore>>((acc, item) => {
    const current = acc[item.year]
    if (!current || item.minScore < current.minScore) {
      acc[item.year] = item
    }
    return acc
  }, {})
}

export default function SchoolDetailPage() {
  const schoolId = Taro.Current.router?.params?.schoolId
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<SchoolDetailResponse | null>(null)
  const [activeMajorSubject, setActiveMajorSubject] = useState<SubjectCategoryKey>('physics')

  useEffect(() => {
    if (!schoolId) {
      setLoading(false)
      return
    }
    (async () => {
      try {
        setLoading(true)
        const data = await schoolApi.detail(schoolId)
        setDetail(data)
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取院校详情失败'
        Taro.showToast({ title: text, icon: 'error' })
      } finally {
        setLoading(false)
      }
    })()
  }, [schoolId])

  const majorSubjectTheme = SUBJECT_THEMES[activeMajorSubject]

  const trendSeriesBySubject = useMemo(() => {
    const physicsRecords = detail?.scoreTrends.filter((item) => normalizeSubjectType(item.subjectType) === 'physics') ?? []
    const historyRecords = detail?.scoreTrends.filter((item) => normalizeSubjectType(item.subjectType) === 'history') ?? []
    return {
      physics: getTrendSummaryByYear(physicsRecords),
      history: getTrendSummaryByYear(historyRecords),
    }
  }, [detail])

  const filteredMajorGroups = useMemo(
    () => detail?.majorGroups.filter((item) => normalizeSubjectType(item.group.subjectType) === activeMajorSubject) ?? [],
    [activeMajorSubject, detail]
  )

  const majorGroupsByYear = useMemo(() => {
    return filteredMajorGroups.reduce<Record<number, MajorGroupEntry[]>>((acc, item) => {
      const year = item.group.year
      if (!acc[year]) acc[year] = []
      acc[year].push(item)
      return acc
    }, {})
  }, [filteredMajorGroups])

  const majorYearItems = useMemo(
    () => Object.keys(majorGroupsByYear)
      .map((year) => Number(year))
      .sort((a, b) => b - a)
      .map((year) => ({
        key: String(year),
        title: `${year} 年`,
        content: (
          <View className="major-groups-list">
            {majorGroupsByYear[year].map((item, index) => {
              const subjectKey = normalizeSubjectType(item.group.subjectType)
              const subjectLabel = subjectKey ? SUBJECT_THEMES[subjectKey].label : (item.group.subjectType || '未区分科类')
              return (
                <View key={`${year}-${item.group.id}-${index}`} className="major-group-card">
                  <View className="major-group-header">
                    <View className="major-group-title-row">
                      <Text className="major-group-name">
                        {item.group.groupName || item.group.specialGroup || `专业组 ${index + 1}`}
                      </Text>
                      <View className="major-group-tags">
                        <Tag color="primary" className="major-group-tag">
                          {subjectLabel}
                        </Tag>
                        {item.group.specialGroup && (
                          <Tag className="major-group-tag secondary">
                            {item.group.specialGroup}
                          </Tag>
                        )}
                        <Tag className="major-group-tag secondary">
                          {item.majors.length} 个专业
                        </Tag>
                      </View>
                    </View>
                    <Text className="major-group-requirements">
                      {item.group.requiredSubjects || item.group.subjectRequirementsRaw || '选科要求待定'}
                    </Text>
                  </View>

                  {item.majors.length ? (
                    <View className="major-list">
                      {item.majors.map((major) => (
                        <View key={major} className="major-item">
                          <Text className="major-item-text">{major}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="no-majors-text">该专业组暂无具体专业信息</Text>
                  )}
                </View>
              )
            })}
          </View>
        ),
      })),
    [majorGroupsByYear]
  )

  // Score trend table data
  const scoreTrendTableData = useMemo(() => {
    const yearSet = new Set<number>([
      ...Object.keys(trendSeriesBySubject.physics).map((year) => Number(year)),
      ...Object.keys(trendSeriesBySubject.history).map((year) => Number(year)),
    ])
    const years = Array.from(yearSet).sort((a, b) => a - b)
    return years.map((year) => ({
      year,
      physics: trendSeriesBySubject.physics[year],
      history: trendSeriesBySubject.history[year],
    }))
  }, [trendSeriesBySubject])

  if (loading) {
    return (
      <View className="loading-page">
        <DotLoading color="primary" />
        <Text className="loading-text">加载中...</Text>
      </View>
    )
  }

  if (!detail) {
    return (
      <View className="error-page">
        <Text className="error-title">未找到院校信息</Text>
        <Button color="primary" fill="outline" onClick={() => Taro.navigateBack()}>
          返回
        </Button>
      </View>
    )
  }

  const school = detail.school

  return (
    <View className="school-detail-page">
      {/* School Header */}
      <View className="school-header">
        <View className="school-avatar-large">
          <Text className="school-avatar-large-text">{school.name.charAt(0)}</Text>
        </View>

        <View className="school-header-tags">
          {school.is985 === 1 && <Tag color="danger" className="header-tag">985</Tag>}
          {school.is211 === 1 && <Tag color="primary" className="header-tag">211</Tag>}
          {school.isDoubleFirst === 1 && <Tag color="success" className="header-tag">双一流</Tag>}
        </View>

        <Text className="school-header-name">{school.name}</Text>

        <View className="school-header-info">
          <Text className="header-info-item">
            📍 {school.province}{school.city ? ` · ${school.city}` : ''}
          </Text>
          <Text className="header-info-item">
            🏫 {school.schoolType || '综合类'}
          </Text>
          <Text className="header-info-item">
            ID: {school.schoolId || '暂无'}
          </Text>
        </View>

        {school.tags && (
          <View className="school-header-extra-tags">
            {school.tags.split(/[,，\s]+/).filter(Boolean).map((tag) => (
              <View key={tag} className="header-extra-tag">
                <Text className="header-extra-tag-text">{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Main Tabs */}
      <Tabs
        className="main-tabs"
        defaultActiveKey="overview"
        items={[
          {
            key: 'overview',
            title: '院校概览',
            content: (
              <View className="overview-content">
                {/* Score Trends - Placeholder for ECharts */}
                <View className="info-card">
                  <Text className="card-title">历年录取趋势</Text>
                  <Text className="card-subtitle">同图对比物理类与历史类近年最低录取分走势</Text>
                  
                  {scoreTrendTableData.length > 0 ? (
                    <View className="score-trend-placeholder">
                      <Text className="placeholder-text">📊 图表功能暂未支持</Text>
                      <View className="score-table">
                        <View className="score-table-header">
                          <Text className="score-table-cell">年份</Text>
                          <Text className="score-table-cell">物理类</Text>
                          <Text className="score-table-cell">历史类</Text>
                        </View>
                        {scoreTrendTableData.map((row) => (
                          <View key={row.year} className="score-table-row">
                            <Text className="score-table-cell">{row.year}</Text>
                            <Text className="score-table-cell">
                              {row.physics ? `${row.physics.minScore}分` : '--'}
                            </Text>
                            <Text className="score-table-cell">
                              {row.history ? `${row.history.minScore}分` : '--'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View className="no-data-placeholder">
                      <Text className="no-data-text">暂无录取趋势数据</Text>
                    </View>
                  )}
                </View>

                {/* Contact Info */}
                <View className="info-card">
                  <Text className="card-title">联系方式</Text>
                  <View className="contact-list">
                    <View className="contact-item">
                      <Text className="contact-label">官方网站</Text>
                      <Text className="contact-value">暂无数据</Text>
                    </View>
                    <View className="contact-item">
                      <Text className="contact-label">招生办</Text>
                      <Text className="contact-value">暂无数据</Text>
                    </View>
                  </View>
                </View>

                {/* School Description */}
                <View className="info-card">
                  <Text className="card-title">院校简介</Text>
                  <Text className="school-description">
                    {school.name}位于{school.city || school.province}，是一所{school.schoolType || '综合'}类院校。
                    {school.is985 === 1 ? ' 作为985工程重点建设高校，在国际上享有较高声誉。' : ''}
                    {school.isDoubleFirst === 1 ? ' 该校入选国家"双一流"建设高校名单，展现了卓越的学科实力。' : ''}
                    该校始终致力于为广大学子提供优质的高等教育资源和广阔的科研平台。
                  </Text>
                </View>
              </View>
            ),
          },
          {
            key: 'majors',
            title: '开设专业',
            content: (
              <View className="majors-content">
                <View className="majors-header">
                  <Text className="majors-title">招生专业组</Text>
                  <Text className="majors-subtitle">先切换科类，再按年份查看对应招生专业组与选科要求</Text>
                </View>

                <CapsuleTabs
                  className="subject-capsule-tabs"
                  defaultActiveKey={activeMajorSubject}
                  onChange={(key) => setActiveMajorSubject(key as SubjectCategoryKey)}
                >
                  <CapsuleTabs.Tab title="物理类" key="physics" />
                  <CapsuleTabs.Tab title="历史类" key="history" />
                </CapsuleTabs>

                {filteredMajorGroups.length > 0 ? (
                  <Tabs
                    key={activeMajorSubject}
                    className="year-tabs"
                    defaultActiveKey={majorYearItems[0]?.key}
                    items={majorYearItems}
                  />
                ) : (
                  <View className="no-majors-placeholder">
                    <Text className="no-majors-text">暂无 {majorSubjectTheme.label} 招生专业组信息</Text>
                  </View>
                )}
              </View>
            ),
          },
        ]}
      />
    </View>
  )
}