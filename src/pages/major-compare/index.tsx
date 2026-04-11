import { useState, useMemo, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  Card,
  Button,
  Input,
  Picker,
  Popup,
  Tag,
  Empty,
  Toast,
  DotLoading,
} from 'antd-mobile'
import { majorCompareApi } from '@/api/majorCompare'
import { majorApi } from '@/api/major'
import type {
  MajorComparisonResponse,
  MajorCompareParams,
  MajorComparisonSchoolRecord,
  Major,
} from '@/types'
import './index.scss'

// Suitability band color mapping
const SUITABILITY_COLORS: Record<string, string> = {
  '冲刺': '#f59e0b',
  '可冲可稳': '#8b5cf6',
  '稳妥': '#3b82f6',
  '保底': '#10b981',
}

interface MajorFamilyOption {
  label: string
  value: string
  seedMajor: string
}

interface ResolvedMajorFamilyOption extends MajorFamilyOption {
  majorId: number
}

// Fixed major families mapped to representative majors from backend config
const MAJOR_FAMILIES: MajorFamilyOption[] = [
  { label: '计算机类', value: 'computer', seedMajor: '计算机科学与技术' },
  { label: '电子信息类', value: 'electronics', seedMajor: '电子信息工程' },
  { label: '电气自动化类', value: 'electrical', seedMajor: '电气工程及其自动化' },
  { label: '经管类', value: 'business', seedMajor: '工商管理' },
  { label: '法学类', value: 'law', seedMajor: '法学' },
  { label: '临床医学类', value: 'medical', seedMajor: '临床医学' },
]

const SUBJECT_TYPES = ['物理类', '历史类']
const INSUFFICIENT_SAMPLE_LABEL = '样本不足'
const MIN_SAMPLE_YEARS = 2

// Helper functions
function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function formatTooltipSeriesLabel(schoolName: string, matchedMajorName?: string): string {
  if (!matchedMajorName) {
    return schoolName
  }
  return `${schoolName}（${truncateText(matchedMajorName, 10)}）`
}

function isInsufficientSample(record: MajorComparisonSchoolRecord): boolean {
  return record.trendLabel === INSUFFICIENT_SAMPLE_LABEL
    || record.availableYearCount < MIN_SAMPLE_YEARS
}

function compareByRankAsc(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null) {
    return 1
  }
  if (b == null) {
    return -1
  }
  return a - b
}

function sortSchoolRecords(records: MajorComparisonSchoolRecord[]): MajorComparisonSchoolRecord[] {
  return [...records].sort((a, b) => {
    const insufficientDiff = Number(isInsufficientSample(a)) - Number(isInsufficientSample(b))
    if (insufficientDiff !== 0) {
      return insufficientDiff
    }

    const latestRankDiff = compareByRankAsc(a.latestMinRank, b.latestMinRank)
    if (latestRankDiff !== 0) {
      return latestRankDiff
    }

    return compareByRankAsc(a.averageMinRank, b.averageMinRank)
  })
}

export default function MajorComparePage() {
  const [loading, setLoading] = useState(false)
  const [loadingFamilies, setLoadingFamilies] = useState(true)
  const [familyOptions, setFamilyOptions] = useState<ResolvedMajorFamilyOption[]>([])

  // Form State
  const [selectedFamily, setSelectedFamily] = useState<string>()
  const [subjectType, setSubjectType] = useState<string>('物理类')
  const [rankPosition, setRankPosition] = useState<string>('')

  // Result State
  const [result, setResult] = useState<MajorComparisonResponse | null>(null)

  // Picker visibility states
  const [familyPickerVisible, setFamilyPickerVisible] = useState(false)
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false)

  const selectedFamilyOption = useMemo(
    () => familyOptions.find((item) => item.value === selectedFamily),
    [familyOptions, selectedFamily],
  )

  const sortedResultRecords = useMemo(
    () => sortSchoolRecords(result?.records ?? []),
    [result],
  )

  // Resolve representative majorId for each allowed family on mount
  useEffect(() => {
    const loadFamilyOptions = async (): Promise<void> => {
      setLoadingFamilies(true)
      try {
        const resolved = await Promise.all(
          MAJOR_FAMILIES.map(async (family) => {
            const majors = await majorApi.list({ keyword: family.seedMajor })
            const exactMatch = majors.find((item: Major) => item.majorName === family.seedMajor)
            const fallbackMatch = majors.find((item: Major) => item.majorName.includes(family.seedMajor))
            const matched = exactMatch ?? fallbackMatch ?? majors[0]
            return matched ? { ...family, majorId: matched.id } : null
          }),
        )

        const availableFamilies = resolved.filter(
          (item): item is ResolvedMajorFamilyOption => item !== null,
        )
        setFamilyOptions(availableFamilies)

        if (availableFamilies.length > 0) {
          setSelectedFamily(availableFamilies[0].value)
        }

        if (availableFamilies.length !== MAJOR_FAMILIES.length) {
          Toast.show({
            content: '部分专业大类暂未匹配到可用专业',
            icon: 'fail',
          })
        }
      } catch {
        Toast.show({
          content: '加载专业大类失败，请稍后重试',
          icon: 'fail',
        })
      } finally {
        setLoadingFamilies(false)
      }
    }

    loadFamilyOptions()
  }, [])

  const handleCompare = async (): Promise<void> => {
    if (!selectedFamilyOption?.majorId) {
      Toast.show({
        content: '请选择一个专业大类',
        icon: 'fail',
      })
      return
    }

    const rankNum = parseInt(rankPosition, 10)
    if (isNaN(rankNum) || rankNum <= 0) {
      Toast.show({
        content: '请填写有效的位次信息',
        icon: 'fail',
      })
      return
    }

    setLoading(true)
    try {
      const params: MajorCompareParams = {
        majorId: selectedFamilyOption.majorId,
        subjectType,
        expandRelatedMajors: true,
        limit: 20,
        rankPosition: rankNum,
      }

      const response = await majorCompareApi.compare(params)
      setResult(response)

      if (response.records.length === 0) {
        Toast.show({
          content: '暂无匹配的院校数据，请尝试调整筛选条件',
          icon: 'fail',
        })
      }
    } catch {
      Toast.show({
        content: '专业分析数据获取失败',
        icon: 'fail',
      })
    } finally {
      setLoading(false)
    }
  }

  const getTrendTagColor = (trendLabel: string): string => {
    if (trendLabel.includes('降')) return 'success'
    if (trendLabel.includes('升')) return 'danger'
    return 'default'
  }

  return (
    <View className="major-compare-page">
      <ScrollView scrollY className="major-compare-scroll">
        {/* Header */}
        <View className="page-header">
          <Text className="page-title">专业分析</Text>
          <Text className="page-subtitle">
            对比不同院校相近专业的历年录取分数与位次趋势，评估报考风险
          </Text>
        </View>

        {/* Filter Card */}
        <Card className="filter-card">
          <View className="filter-row">
            <Text className="filter-label">专业大类</Text>
            <View
              className="filter-picker-trigger"
              onClick={() => setFamilyPickerVisible(true)}
            >
              <Text className="filter-picker-value">
                {loadingFamilies ? '加载中...' : selectedFamilyOption?.label || '请选择'}
              </Text>
              <Text className="filter-picker-arrow">▼</Text>
            </View>
          </View>

          <View className="filter-row">
            <Text className="filter-label">科类</Text>
            <View
              className="filter-picker-trigger"
              onClick={() => setSubjectPickerVisible(true)}
            >
              <Text className="filter-picker-value">{subjectType}</Text>
              <Text className="filter-picker-arrow">▼</Text>
            </View>
          </View>

          <View className="filter-row">
            <Text className="filter-label">我的位次</Text>
            <Input
              className="rank-input"
              placeholder="请输入位次"
              type="number"
              value={rankPosition}
              onChange={setRankPosition}
            />
          </View>

          <Button
            color="primary"
            block
            loading={loading}
            onClick={handleCompare}
            className="compare-btn"
          >
            开始分析
          </Button>
        </Card>

        {/* Family Picker Popup */}
        <Popup
          visible={familyPickerVisible}
          onMaskClick={() => setFamilyPickerVisible(false)}
          bodyStyle={{ height: '40vh' }}
        >
          <Picker
            columns={[familyOptions.map(f => ({ label: f.label, value: f.value }))]}
            value={selectedFamily ? [selectedFamily] : undefined}
            onConfirm={(val) => {
              setSelectedFamily(val?.[0] as string)
              setFamilyPickerVisible(false)
            }}
            onCancel={() => setFamilyPickerVisible(false)}
          />
        </Popup>

        {/* Subject Type Picker Popup */}
        <Popup
          visible={subjectPickerVisible}
          onMaskClick={() => setSubjectPickerVisible(false)}
          bodyStyle={{ height: '40vh' }}
        >
          <Picker
            columns={[SUBJECT_TYPES.map(t => ({ label: t, value: t }))]}
            value={[subjectType]}
            onConfirm={(val) => {
              setSubjectType(val[0] as string)
              setSubjectPickerVisible(false)
            }}
            onCancel={() => setSubjectPickerVisible(false)}
          />
        </Popup>

        {/* Results Section */}
        {loading ? (
          <View className="loading-container">
            <DotLoading color="primary" />
            <Text className="loading-text">正在分析历年数据...</Text>
          </View>
        ) : !result ? (
          <View className="empty-container">
            <Empty description="请在上方选择条件并点击开始分析" />
          </View>
        ) : (
          <View className="results-container">
            {/* Summary Cards */}
            <View className="summary-section">
              <Text className="section-title">对比结论速览</Text>
              
              <View className="summary-cards">
                <View className="summary-card">
                  <Text className="summary-label">分析样本</Text>
                  <Text className="summary-value">
                    {result.summary.schoolCount}
                    <Text className="summary-unit">所院校</Text>
                  </Text>
                  <Text className="summary-desc">
                    涵盖 {result.summary.comparedYearCount} 年数据
                  </Text>
                  <View className="summary-tags">
                    <Tag color="warning">冲刺: {result.summary.aggressiveCount}</Tag>
                    <Tag color="primary">稳妥: {result.summary.balancedCount}</Tag>
                    <Tag color="success">保底: {result.summary.conservativeCount}</Tag>
                  </View>
                </View>

                <View className="summary-card">
                  <Text className="summary-label">录取最稳定院校</Text>
                  <Text className="summary-value primary">
                    {result.summary.mostStableSchool || '暂无数据'}
                  </Text>
                  <View className="summary-sub">
                    <Text className="summary-label">波动最大院校</Text>
                    <Text className="summary-value danger">
                      {result.summary.highestVolatilitySchool || '暂无数据'}
                    </Text>
                  </View>
                </View>

                <View className="summary-card">
                  <Text className="summary-label">智能洞察</Text>
                  {result.summary.insights.length > 0 ? (
                    <View className="insight-list">
                      {result.summary.insights.slice(0, 3).map((insight, idx) => (
                        <Text key={idx} className="insight-item">{insight}</Text>
                      ))}
                    </View>
                  ) : (
                    <Text className="insight-empty">暂无明显趋势洞察</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Chart Placeholder */}
            {result.records.length > 0 && (
              <Card className="chart-card">
                <Text className="section-title">历年位次走势</Text>
                <View className="chart-placeholder">
                  <Text className="chart-placeholder-text">图表功能暂未支持</Text>
                </View>
              </Card>
            )}

            {/* School Comparison Cards */}
            <View className="schools-section">
              <Text className="section-title">院校对比明细</Text>

              {sortedResultRecords.map((school: MajorComparisonSchoolRecord) => (
                <View key={school.seriesKey} className="school-card">
                  <View className="school-row">
                    {/* Left: Basic Info */}
                    <View className="school-info-col">
                      <View className="school-header-compact">
                        <Text className="school-name">{school.schoolName}</Text>
                        <View className="school-tags">
                          {school.schoolLevel && <Tag color="primary">{school.schoolLevel}</Tag>}
                          {school.city && <Tag>{school.city}</Tag>}
                          <Tag color="cyan">{school.subjectType}</Tag>
                        </View>
                      </View>
                      <Text className="school-meta-compact">
                        匹配: {school.majorFamilyName} ({school.matchedMajorName}) | 专业组: {school.groupName}
                      </Text>
                    </View>

                    {/* Right: Tags and Stats */}
                    <View className="school-stats-col">
                      <View className="school-tags-right">
                        {school.suitabilityBand && (
                          <Tag
                            color="default"
                            style={{
                              backgroundColor: SUITABILITY_COLORS[school.suitabilityBand] || '#default',
                              color: '#fff',
                              '--border-radius': '12px',
                            }}
                          >
                            {school.suitabilityBand}
                          </Tag>
                        )}
                        {school.trendLabel !== INSUFFICIENT_SAMPLE_LABEL && (
                          <Tag color={getTrendTagColor(school.trendLabel)}>
                            {school.trendLabel}
                          </Tag>
                        )}
                      </View>

                      <View className="score-stats-compact">
                        <View className="stat-compact">
                          <Text className="stat-label">最新:</Text>
                          <Text className="stat-value highlight">{school.latestMinRank}</Text>
                        </View>
                        <View className="stat-compact">
                          <Text className="stat-label">三年均:</Text>
                          <Text className="stat-value">{Math.round(school.averageMinRank)}</Text>
                        </View>
                        <View className="stat-compact">
                          <Text className="stat-label">波动:</Text>
                          <Text className="stat-value">{school.rankVolatility}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className="page-footer" />
          </View>
        )}
      </ScrollView>
    </View>
  )
}