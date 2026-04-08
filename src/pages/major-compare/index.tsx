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
  Progress,
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
const SCHOOL_LEVELS = ['985', '211', '双一流', '普通本科']

export default function MajorComparePage() {
  const [loading, setLoading] = useState(false)
  const [loadingFamilies, setLoadingFamilies] = useState(true)
  const [familyOptions, setFamilyOptions] = useState<ResolvedMajorFamilyOption[]>([])

  // Form State
  const [selectedFamily, setSelectedFamily] = useState<string>()
  const [subjectType, setSubjectType] = useState<string>('物理类')
  const [rankPosition, setRankPosition] = useState<string>('')
  const [schoolLevel, setSchoolLevel] = useState<string | undefined>(undefined)

  // Result State
  const [result, setResult] = useState<MajorComparisonResponse | null>(null)

  // Picker visibility states
  const [familyPickerVisible, setFamilyPickerVisible] = useState(false)
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false)
  const [levelPickerVisible, setLevelPickerVisible] = useState(false)

  const selectedFamilyOption = useMemo(
    () => familyOptions.find((item) => item.value === selectedFamily),
    [familyOptions, selectedFamily],
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

      if (schoolLevel) params.schoolLevel = schoolLevel

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

  const getStabilityColor = (score: number): string => {
    if (score > 80) return '#10b981'
    if (score > 60) return '#f59e0b'
    return '#ef4444'
  }

  const getRiskColor = (score: number): string => {
    if (score > 60) return '#ef4444'
    if (score > 30) return '#f59e0b'
    return '#10b981'
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

          <View className="filter-row">
            <Text className="filter-label">院校层级</Text>
            <View
              className="filter-picker-trigger"
              onClick={() => setLevelPickerVisible(true)}
            >
              <Text className="filter-picker-value">
                {schoolLevel || '全部层级'}
              </Text>
              <Text className="filter-picker-arrow">▼</Text>
            </View>
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

        {/* School Level Picker Popup */}
        <Popup
          visible={levelPickerVisible}
          onMaskClick={() => setLevelPickerVisible(false)}
          bodyStyle={{ height: '40vh' }}
        >
          <Picker
            columns={[SCHOOL_LEVELS.map(l => ({ label: l, value: l }))]}
            value={schoolLevel ? [schoolLevel] : undefined}
            onConfirm={(val) => {
              setSchoolLevel(val?.[0] as string | undefined)
              setLevelPickerVisible(false)
            }}
            onCancel={() => setLevelPickerVisible(false)}
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
              <Text className="section-desc">按最新录取位次排序</Text>

              {result.records.map((school: MajorComparisonSchoolRecord) => (
                <Card key={school.seriesKey} className="school-card">
                  {/* School Header */}
                  <View className="school-header">
                    <View className="school-info-left">
                      <Text className="school-name">{school.schoolName}</Text>
                      <View className="school-tags">
                        {school.schoolLevel && (
                          <Tag color="primary" className="school-tag">{school.schoolLevel}</Tag>
                        )}
                        {school.city && (
                          <Tag className="school-tag">{school.city}</Tag>
                        )}
                        <Tag color="cyan" className="school-tag">{school.subjectType}</Tag>
                      </View>
                    </View>
                    <View className="school-info-right">
                      {school.suitabilityBand && (
                        <Tag
                          color="default"
                          style={{
                            backgroundColor: SUITABILITY_COLORS[school.suitabilityBand] || '#default',
                            color: '#fff',
                          }}
                          className="suitability-tag"
                        >
                          {school.suitabilityBand}
                        </Tag>
                      )}
                      <Tag color={getTrendTagColor(school.trendLabel)} className="trend-tag">
                        {school.trendLabel}
                      </Tag>
                    </View>
                  </View>

                  {/* School Meta */}
                  <View className="school-meta">
                    <Text className="meta-text">匹配专业: {school.majorFamilyName}</Text>
                    <Text className="meta-text">具体专业: {school.matchedMajorName}</Text>
                  </View>

                  {/* Stats Grid */}
                  <View className="stats-grid">
                    <View className="stat-item">
                      <Text className="stat-label">最新最低位次</Text>
                      <Text className="stat-value highlight">{school.latestMinRank}</Text>
                    </View>
                    <View className="stat-item">
                      <Text className="stat-label">三年平均位次</Text>
                      <Text className="stat-value">{Math.round(school.averageMinRank)}</Text>
                    </View>
                    <View className="stat-item">
                      <Text className="stat-label">位次波动区间</Text>
                      <Text className="stat-value">{school.rankVolatility}</Text>
                    </View>
                    <View className="stat-item">
                      <Text className="stat-label">数据年数</Text>
                      <Text className="stat-value">{school.availableYearCount}年</Text>
                    </View>
                  </View>

                  {/* Progress Bars */}
                  <View className="progress-section">
                    <View className="progress-item">
                      <View className="progress-header">
                        <Text className="progress-label">稳定性评分</Text>
                        <Text
                          className="progress-value"
                          style={{ color: getStabilityColor(school.stabilityScore) }}
                        >
                          {school.stabilityScore.toFixed(1)}
                        </Text>
                      </View>
                      <Progress
                        percent={school.stabilityScore}
                        style={{
                          '--fill-color': getStabilityColor(school.stabilityScore),
                        }}
                      />
                    </View>

                    <View className="progress-item">
                      <View className="progress-header">
                        <Text className="progress-label">报考风险指数</Text>
                        <Text
                          className="progress-value"
                          style={{ color: getRiskColor(school.riskScore) }}
                        >
                          {school.riskScore.toFixed(1)}
                        </Text>
                      </View>
                      <Progress
                        percent={Math.min(100, school.riskScore)}
                        style={{
                          '--fill-color': getRiskColor(school.riskScore),
                        }}
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            <View className="page-footer" />
          </View>
        )}
      </ScrollView>
    </View>
  )
}