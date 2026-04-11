import { useState, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Card, Button, Input, Picker, Toast } from 'antd-mobile'
import { scoreApi } from '@/api/score'
import type { ScoreRanking, ScoreToRankResponse } from '@/types'
import { useSwipeTab } from '@/hooks/useSwipeTab'
import CustomTabBar from '@/custom-tab-bar'
import './index.scss'

const SCORE_ANALYSIS_YEARS = [2025, 2024, 2023, 2022, 2021]
const SUBJECT_TYPES = ['物理类', '历史类']

export default function ScoreAnalysisPage() {
  const [year, setYear] = useState<number>(2025)
  const [subjectType, setSubjectType] = useState<string>('物理类')
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<ScoreRanking[]>([])

  const [score, setScore] = useState<string>('')
  const [convertLoading, setConvertLoading] = useState<boolean>(false)
  const [convertResult, setConvertResult] = useState<ScoreToRankResponse | null>(null)

  const [yearPickerVisible, setYearPickerVisible] = useState(false)
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false)

  const swipeHandlers = useSwipeTab()

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true)
      try {
        const result = await scoreApi.rankDistribution({ year, subjectType })
        setData(result)
      } catch {
        Toast.show({
          content: '获取一分一段数据失败',
          icon: 'fail',
        })
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [year, subjectType])

  const handleConvert = async (): Promise<void> => {
    const scoreNum = parseInt(score, 10)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 750) {
      Toast.show({
        content: '请输入有效分数(0-750)',
        icon: 'fail',
      })
      return
    }
    setConvertLoading(true)
    try {
      const response = await scoreApi.scoreToRank({ year, subjectType, score: scoreNum })
      setConvertResult(response)
    } catch {
      Toast.show({
        content: '分数换算失败',
        icon: 'fail',
      })
    } finally {
      setConvertLoading(false)
    }
  }

  const resultCards: { label: string; value: number; color: string }[] = convertResult
    ? [
        { label: '匹配分数', value: convertResult.matchedScore, color: 'var(--color-text-main)' },
        { label: '对应位次', value: convertResult.rank, color: 'var(--color-primary)' },
        { label: '同分人数', value: convertResult.sameCount, color: 'var(--color-text-main)' },
      ]
    : []

  return (
    <View className="score-analysis-page" {...swipeHandlers}>
      <ScrollView scrollY className="score-analysis-scroll">
        {/* Header */}
        <View className="page-header">
          <Text className="page-title">成绩分析</Text>
          <Text className="page-subtitle">基于一分一段表，精准换算分数与位次</Text>
        </View>

        {/* Filters */}
        <Card className="filter-card">
          <View className="filter-row">
            <Text className="filter-label">年份</Text>
            <View
              className="filter-picker"
              onClick={() => setYearPickerVisible(true)}
            >
              <Text className="filter-value">{year}</Text>
              <Text className="picker-arrow">▼</Text>
            </View>
          </View>
          <View className="filter-row">
            <Text className="filter-label">科目类</Text>
            <View
              className="filter-picker"
              onClick={() => setSubjectPickerVisible(true)}
            >
              <Text className="filter-value">{subjectType}</Text>
              <Text className="picker-arrow">▼</Text>
            </View>
          </View>
        </Card>

        {/* Year Picker */}
        <Picker
          columns={[SCORE_ANALYSIS_YEARS.map(y => ({ label: String(y), value: y }))]}
          visible={yearPickerVisible}
          onClose={() => setYearPickerVisible(false)}
          value={[year]}
          onConfirm={(val) => {
            setYear(val[0] as number)
          }}
        />

        {/* Subject Type Picker */}
        <Picker
          columns={[SUBJECT_TYPES.map(t => ({ label: t, value: t }))]}
          visible={subjectPickerVisible}
          onClose={() => setSubjectPickerVisible(false)}
          value={[subjectType]}
          onConfirm={(val) => {
            setSubjectType(val[0] as string)
          }}
        />

        {/* Score Distribution Section */}
        <Card className="section-card">
          <View className="section-header">
            <Text className="section-title">分数段分布</Text>
            <Text className="section-desc">{year}年{subjectType}一分一段表</Text>
          </View>
          
          {loading ? (
            <View className="loading-container">
              <Text className="loading-text">加载中...</Text>
            </View>
          ) : data.length > 0 ? (
            <View className="distribution-list">
              {data.slice(0, 50).map((item) => (
                <View key={item.score} className="distribution-item">
                  <View className="distribution-score">
                    <Text className="score-number">{item.score}</Text>
                    <Text className="score-label">分</Text>
                  </View>
                  <View className="distribution-bar-container">
                    <View 
                      className="distribution-bar" 
                      style={{ 
                        width: `${Math.min((item.count / Math.max(...data.map(d => d.count))) * 100, 100)}%` 
                      }}
                    />
                  </View>
                  <View className="distribution-count">
                    <Text className="count-number">{item.count}</Text>
                    <Text className="count-label">人</Text>
                  </View>
                </View>
              ))}
              {data.length > 50 && (
                <View className="more-hint">
                  <Text className="more-text">仅显示前50条数据</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="empty-container">
              <Text className="empty-text">暂无数据</Text>
            </View>
          )}
        </Card>

        {/* Score Conversion Section */}
        <Card className="section-card">
          <View className="section-header">
            <Text className="section-title">分数换算</Text>
          </View>
          
          <View className="convert-section">
            <Text className="convert-hint">
              输入你的分数，查看在 {year}年{subjectType} 中的位次
            </Text>
            
            <View className="convert-input-row">
              <Input
                className="score-input"
                placeholder="输入分数"
                type="number"
                value={score}
                onChange={setScore}
              />
              <Button
                color="primary"
                loading={convertLoading}
                onClick={handleConvert}
                className="convert-btn"
              >
                查询位次
              </Button>
            </View>
          </View>

          {convertResult && (
            <View className="result-cards">
              {resultCards.map((card) => (
                <View key={card.label} className="result-card">
                  <Text className="result-label">{card.label}</Text>
                  <Text className="result-value" style={{ color: card.color }}>
                    {card.value.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* Data Table Section */}
        <Card className="section-card table-card">
          <View className="section-header">
            <Text className="section-title">一分一段数据表</Text>
          </View>
          
          {loading ? (
            <View className="loading-container">
              <Text className="loading-text">加载中...</Text>
            </View>
          ) : data.length > 0 ? (
            <ScrollView scrollX className="table-scroll">
              <View className="data-table">
                <View className="table-header">
                  <View className="table-cell header-cell score-cell">
                    <Text className="header-text">分数</Text>
                  </View>
                  <View className="table-cell header-cell count-cell">
                    <Text className="header-text">本段人数</Text>
                  </View>
                  <View className="table-cell header-cell cumulative-cell">
                    <Text className="header-text">累计人数</Text>
                  </View>
                </View>
                {data.map((item) => (
                  <View key={item.score} className="table-row">
                    <View className="table-cell score-cell">
                      <Text className="cell-text score-text">{item.score}</Text>
                    </View>
                    <View className="table-cell count-cell">
                      <Text className="cell-text">{item.count.toLocaleString()}</Text>
                    </View>
                    <View className="table-cell cumulative-cell">
                      <Text className="cell-text">{item.cumulativeCount.toLocaleString()}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View className="empty-container">
              <Text className="empty-text">暂无数据</Text>
            </View>
          )}
        </Card>

        <View className="page-footer" />
      </ScrollView>
      <CustomTabBar />
    </View>
  )
}