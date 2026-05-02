import { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Tag, DotLoading, Button } from 'antd-mobile'
import { schoolApi } from '@/api/school'
import type { MajorGroup, SchoolDetailResponse, SchoolScore } from '@/types'
import './index.scss'

type SubjectCategoryKey = 'physics' | 'history'
type TabKey = 'overview' | 'majors'

interface SubjectTheme {
  key: SubjectCategoryKey
  label: string
  accent: string
}

interface MajorGroupEntry {
  group: MajorGroup
  majors: string[]
}

const SUBJECT_THEMES: Record<SubjectCategoryKey, SubjectTheme> = {
  physics: { key: 'physics', label: '物理类', accent: '#4f46e5' },
  history: { key: 'history', label: '历史类', accent: '#b45309' },
}

const SUBJECT_ALIASES: Record<SubjectCategoryKey, string[]> = {
  physics: ['物理类', '理科', 'physics', 'phy'],
  history: ['历史类', '文科', 'history', 'his'],
}

function normalizeSubjectType(subjectType: string | undefined | null): SubjectCategoryKey | null {
  const normalized = subjectType?.trim().toLowerCase()
  if (!normalized) return null
  return (Object.entries(SUBJECT_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalized.includes(alias.toLowerCase()))
  )?.[0] as SubjectCategoryKey) ?? null
}

function getTrendSummaryByYear(scoreTrends: SchoolScore[]): Record<number, SchoolScore> {
  return scoreTrends.reduce<Record<number, SchoolScore>>((acc, item) => {
    const current = acc[item.year]
    if (!current || item.minScore < current.minScore) acc[item.year] = item
    return acc
  }, {})
}

export default function SchoolDetailPage() {
  const schoolId = Taro.Current.router?.params?.schoolId
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<SchoolDetailResponse | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [activeMajorSubject, setActiveMajorSubject] = useState<SubjectCategoryKey>('physics')
  const [activeMajorYear, setActiveMajorYear] = useState<number | null>(null)

  useEffect(() => {
    if (!schoolId) { setLoading(false); return }
    ;(async () => {
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

  const scoreTrendTableData = useMemo(() => {
    const yearSet = new Set<number>([
      ...Object.keys(trendSeriesBySubject.physics).map(Number),
      ...Object.keys(trendSeriesBySubject.history).map(Number),
    ])
    return Array.from(yearSet).sort((a, b) => a - b).map((year) => ({
      year,
      physics: trendSeriesBySubject.physics[year],
      history: trendSeriesBySubject.history[year],
    }))
  }, [trendSeriesBySubject])

  const filteredMajorGroups = useMemo(
    () => detail?.majorGroups.filter((item) => normalizeSubjectType(item.group.subjectType) === activeMajorSubject) ?? [],
    [activeMajorSubject, detail]
  )

  const majorYears = useMemo(() => {
    const years = new Set(filteredMajorGroups.map((item) => item.group.year))
    return Array.from(years).sort((a, b) => b - a)
  }, [filteredMajorGroups])

  const currentYearMajors = useMemo(() => {
    const year = activeMajorYear ?? majorYears[0] ?? 0
    return filteredMajorGroups.filter((item) => item.group.year === year)
  }, [filteredMajorGroups, activeMajorYear, majorYears])

  // Auto-select first year
  useEffect(() => {
    if (!activeMajorYear && majorYears.length > 0) {
      setActiveMajorYear(majorYears[0])
    }
  }, [activeMajorYear, majorYears])

  // Reset year when subject changes
  useEffect(() => {
    if (majorYears.length > 0) setActiveMajorYear(majorYears[0])
  }, [activeMajorSubject])

  if (loading) {
    return (
      <View className='loading-page'>
        <DotLoading color='primary' />
        <Text className='loading-text'>加载中...</Text>
      </View>
    )
  }

  if (!detail) {
    return (
      <View className='error-page'>
        <Text className='error-title'>未找到院校信息</Text>
        <Button color='primary' fill='outline' onClick={() => Taro.navigateBack()}>返回</Button>
      </View>
    )
  }

  const school = detail.school

  return (
    <View className='sd-page'>
      {/* School Header */}
      <View className='sd-header'>
        <View className='sd-header-top'>
          <View className='sd-avatar'>
            <Text className='sd-avatar-text'>{school.name.charAt(0)}</Text>
          </View>
          <View className='sd-header-main'>
            <Text className='sd-header-name'>{school.name}</Text>
            <View className='sd-header-tags'>
              {school.is985 === 1 && <Tag color='danger' className='sd-tag'>985</Tag>}
              {school.is211 === 1 && <Tag color='primary' className='sd-tag'>211</Tag>}
              {school.isDoubleFirst === 1 && <Tag color='success' className='sd-tag'>双一流</Tag>}
            </View>
            <Text className='sd-header-location'>{school.province}{school.city ? ` · ${school.city}` : ''} · {school.schoolType || '综合类'}</Text>
          </View>
        </View>
        {school.tags ? (
          <View className='sd-extra-tags'>
            {school.tags.split(/[,，\s]+/).filter(Boolean).map((tag) => (
              <View key={tag} className='sd-extra-tag'><Text className='sd-extra-tag-text'>{tag}</Text></View>
            ))}
          </View>
        ) : null}
      </View>

      {/* Tab Bar */}
      <View className='sd-tabbar'>
        <View
          className={`sd-tabbar-item ${activeTab === 'overview' ? 'sd-tabbar-active' : ''}`}
          onClick={() => setActiveTab('overview')}
        ><Text className={`sd-tabbar-text ${activeTab === 'overview' ? 'sd-tabbar-text-active' : ''}`}>院校概览</Text></View>
        <View
          className={`sd-tabbar-item ${activeTab === 'majors' ? 'sd-tabbar-active' : ''}`}
          onClick={() => setActiveTab('majors')}
        ><Text className={`sd-tabbar-text ${activeTab === 'majors' ? 'sd-tabbar-text-active' : ''}`}>开设专业</Text></View>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <View className='sd-content'>
          {/* Score Trends */}
          <View className='sd-card'>
            <Text className='sd-card-title'>历年录取趋势</Text>
            <Text className='sd-card-sub'>物理类与历史类近年最低录取分</Text>
            {scoreTrendTableData.length > 0 ? (
              <View className='sd-score-table'>
                <View className='sd-score-row sd-score-header'>
                  <Text className='sd-score-cell'>年份</Text>
                  <Text className='sd-score-cell'>物理类</Text>
                  <Text className='sd-score-cell'>历史类</Text>
                </View>
                {scoreTrendTableData.map((row) => (
                  <View key={row.year} className='sd-score-row'>
                    <Text className='sd-score-cell'>{row.year}</Text>
                    <Text className='sd-score-cell'>{row.physics ? `${row.physics.minScore}分` : '--'}</Text>
                    <Text className='sd-score-cell'>{row.history ? `${row.history.minScore}分` : '--'}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className='sd-empty-text'>暂无录取趋势数据</Text>
            )}
          </View>

          {/* Description */}
          <View className='sd-card'>
            <Text className='sd-card-title'>院校简介</Text>
            <Text className='sd-desc-text'>
              {school.name}位于{school.city || school.province}，是一所{school.schoolType || '综合'}类院校。
              {school.is985 === 1 ? '作为985工程重点建设高校，在国际上享有较高声誉。' : ''}
              {school.isDoubleFirst === 1 ? '该校入选国家"双一流"建设高校名单，展现了卓越的学科实力。' : ''}
              该校始终致力于为广大学子提供优质的高等教育资源和广阔的科研平台。
            </Text>
          </View>
        </View>
      ) : (
        <View className='sd-content'>
          {/* Subject Toggle */}
          <View className='sd-subject-bar'>
            {(['physics', 'history'] as SubjectCategoryKey[]).map((key) => (
              <View
                key={key}
                className={`sd-subject-btn ${activeMajorSubject === key ? 'sd-subject-btn-active' : ''}`}
                onClick={() => setActiveMajorSubject(key)}
              ><Text className={`sd-subject-btn-text ${activeMajorSubject === key ? 'sd-subject-btn-text-active' : ''}`}>{SUBJECT_THEMES[key].label}</Text></View>
            ))}
          </View>

          {/* Year Filter */}
          {majorYears.length > 0 ? (
            <View className='sd-year-bar'>
              {majorYears.map((year) => (
                <View
                  key={year}
                  className={`sd-year-btn ${(activeMajorYear ?? majorYears[0]) === year ? 'sd-year-btn-active' : ''}`}
                  onClick={() => setActiveMajorYear(year)}
                ><Text className={`sd-year-btn-text ${(activeMajorYear ?? majorYears[0]) === year ? 'sd-year-btn-text-active' : ''}`}>{year}年</Text></View>
              ))}
            </View>
          ) : null}

          {/* Major Groups */}
          {currentYearMajors.length > 0 ? (
            currentYearMajors.map((item, index) => (
              <View key={`${item.group.id}-${index}`} className='sd-major-card'>
                <View className='sd-major-card-top'>
                  <Text className='sd-major-name'>
                    {item.group.groupName || item.group.specialGroup || `专业组 ${index + 1}`}
                  </Text>
                  <View className='sd-major-tags'>
                    <Tag color='primary' className='sd-major-tag'>{SUBJECT_THEMES[activeMajorSubject].label}</Tag>
                    <Tag className='sd-major-tag sd-major-tag-count'>{item.majors.length} 个专业</Tag>
                  </View>
                </View>
                <Text className='sd-major-req'>
                  {item.group.requiredSubjects || item.group.subjectRequirementsRaw || '选科要求待定'}
                </Text>
                {item.majors.length ? (
                  <View className='sd-major-list'>
                    {item.majors.map((major) => (
                      <View key={major} className='sd-major-item'><Text className='sd-major-item-text'>{major}</Text></View>
                    ))}
                  </View>
                ) : (
                  <Text className='sd-empty-text'>该专业组暂无具体专业信息</Text>
                )}
              </View>
            ))
          ) : (
            <View className='sd-card'>
              <Text className='sd-empty-text'>暂无 {majorSubjectTheme.label} 招生专业组信息</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}