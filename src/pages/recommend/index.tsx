import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Button, DotLoading, Toast, Tag } from 'antd-mobile'
import { profileApi } from '@/api/profile'
import { recommendApi } from '@/api/recommend'
import { useAuth } from '@/contexts/useAuthHook'
import type { RecommendItem, RecommendResponse, UserProfile, PortfolioRecommendResponse } from '@/types'
import CustomTabBar from '@/custom-tab-bar'
import './index.scss'

function hasRequiredProfile(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  return Boolean(profile.examYear && profile.subjectType && profile.rankPosition)
}

function ProbabilityBar({ probability, tier }: { probability: number; tier: 'reach' | 'steady' | 'safe' }) {
  const percent = probability * 100
  return (
    <View className='prob-container'>
      <View className='prob-label'>
        <Text className='prob-label-text'>录取概率</Text>
        <Text className={`prob-value prob-value-${tier}`}>{percent.toFixed(2)}%</Text>
      </View>
      <View className='prob-bar-bg'>
        <View className={`prob-bar-fill prob-bar-fill-${tier}`} style={{ width: `${percent}%` }} />
      </View>
    </View>
  )
}

function SchoolCard({ item, tier, index }: { item: RecommendItem; tier: 'reach' | 'steady' | 'safe'; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const firstMajor = item.majorNames?.[0]

  return (
    <View className={`school-card card-${tier}`} onClick={() => setIsExpanded(!isExpanded)}>
      <View className='school-card-header'>
        <View className={`school-rank-badge school-rank-badge-${tier}`}>{index + 1}</View>
        <View className='school-card-title'>
          <Text className='school-name'>{item.schoolName}</Text>
          {!isExpanded && firstMajor && (
            <Text className='major-tag-collapsed'>{firstMajor}</Text>
          )}
        </View>
        <View className='school-card-controls'>
          <ProbabilityBar probability={item.admissionProbability} tier={tier} />
          <View className={`expand-chevron ${isExpanded ? 'icon-rotated' : ''}`}>
            <Text className='chevron-icon'>▼</Text>
          </View>
        </View>
      </View>

      {isExpanded && (
        <View className='school-card-expanded'>
          <View className='school-tags-expanded'>
            {item.schoolLevel && item.schoolLevel !== '普通本科' && (
              <Tag color='primary' fill='outline' className='school-tag-level'>
                🏆 {item.schoolLevel}
              </Tag>
            )}
            <Text className='school-city'>📍 {item.city}</Text>
          </View>

          {item.majorNames && item.majorNames.length > 0 && (
            <View className='school-card-majors'>
              <Text className='majors-label'>🎓 推荐专业组</Text>
              <View className='majors-list'>
                {item.majorNames.slice(0, 8).map((major, i) => (
                  <Tag key={i} fill='outline' className='major-tag'>{major}</Tag>
                ))}
                {item.majorNames.length > 8 && (
                  <Text className='major-tag-more'>+{item.majorNames.length - 8}</Text>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  )
}

function getCarouselTransform(index: number, activeIdx: number) {
  const isCenter = activeIdx === index
  let isLeft = false
  let isRight = false

  if (!isCenter) {
    if (activeIdx === 0) { isLeft = index === 2; isRight = index === 1 }
    else if (activeIdx === 1) { isLeft = index === 0; isRight = index === 2 }
    else if (activeIdx === 2) { isLeft = index === 1; isRight = index === 0 }
  }

  if (isCenter) {
    return { isCenter, x: 0, scale: 1, zIndex: 5, opacity: 1 }
  }
  if (isLeft) {
    return { isCenter, x: -65, scale: 0.85, zIndex: 1, opacity: 0.9 }
  }
  if (isRight) {
    return { isCenter, x: 65, scale: 0.85, zIndex: 1, opacity: 0.9 }
  }
  return { isCenter, x: 0, scale: 0, zIndex: 0, opacity: 0 }
}

export default function RecommendPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RecommendResponse | null>(null)
  const [portfolioData, setPortfolioData] = useState<PortfolioRecommendResponse | null>(null)
  const [needProfile, setNeedProfile] = useState(false)
  const [activePortfolioIndex, setActivePortfolioIndex] = useState<number>(0)
  const [activeVolunteerIndex, setActiveVolunteerIndex] = useState<number>(0)
  const [expandedPortfolioDescriptions, setExpandedPortfolioDescriptions] = useState<Record<string, boolean>>({})

  const redirectToProfile = useCallback(() => {
    setNeedProfile(true)
    Toast.show({ content: '请先完善个人档案中的年份、科类和位次信息', icon: 'fail' })
    Taro.redirectTo({ url: '/pages/profile/index' })
  }, [])

  const normalizedData = useMemo(
    () => ({
      reach: Array.isArray(data?.reach) ? data.reach : [],
      steady: Array.isArray(data?.steady) ? data.steady : [],
      safe: Array.isArray(data?.safe) ? data.safe : [],
    }),
    [data],
  )

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)

        const profile = await profileApi.get()
        if (!hasRequiredProfile(profile)) {
          redirectToProfile()
          return
        }

        const [volunteersResult, portfoliosResult] = await Promise.all([
          data ? Promise.resolve(data) : recommendApi.getVolunteers(),
          portfolioData ? Promise.resolve(portfolioData) : recommendApi.getPortfolios(),
        ])

        if (!data) setData(volunteersResult)
        if (!portfolioData) setPortfolioData(portfoliosResult)
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取推荐结果失败'
        if (text.includes('档案') || text.includes('profile') || text.includes('404') || text.includes('401')) {
          redirectToProfile()
        } else {
          Toast.show({ content: text, icon: 'fail' })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const togglePortfolioDescription = useCallback((style: string) => {
    setExpandedPortfolioDescriptions((prev) => ({
      ...prev,
      [style]: !prev[style],
    }))
  }, [])

  const panels = [
    {
      id: 'reach',
      tier: 'reach' as const,
      title: '冲一冲',
      icon: '🎯',
      desc: '录取概率较低，但值得一试的高校',
      data: normalizedData.reach
    },
    {
      id: 'steady',
      tier: 'steady' as const,
      title: '稳一稳',
      icon: '🧭',
      desc: '录取概率适中，符合成绩预期的主力军',
      data: normalizedData.steady
    },
    {
      id: 'safe',
      tier: 'safe' as const,
      title: '保一保',
      icon: '🛡️',
      desc: '录取概率较高，作为保底的安全选择',
      data: normalizedData.safe
    }
  ]

  const portfolioPanels = useMemo(() => {
    const portfolios = Array.isArray(portfolioData?.portfolios) ? portfolioData.portfolios : []

    return portfolios.map((portfolio) => {
      const isAggressive = portfolio.style === 'aggressive'
      const isConservative = portfolio.style === 'conservative'

      let tier: 'reach' | 'steady' | 'safe' = 'steady'
      let title = '均衡填报方案'
      let shortDesc = '冲稳保比例均衡，适合作为首选主方案直接参考填报。'
      let icon = '🧭'

      if (isAggressive) {
        tier = 'reach'
        title = '冲刺填报方案'
        shortDesc = '为高目标院校预留更多席位，适合想冲更高层次学校时直接照表填报。'
        icon = '🎯'
      }

      if (isConservative) {
        tier = 'safe'
        title = '稳妥填报方案'
        shortDesc = '保底更厚、整体更稳，适合优先确保录取结果时直接采用。'
        icon = '🛡️'
      }

      return {
        id: portfolio.style,
        tier,
        title,
        shortDesc,
        icon,
        portfolio,
      }
    })
  }, [portfolioData])

  if (loading) {
    return (
      <View className='recommend-loading'>
        <View className='recommend-layout-bg' />
        <View className='state-card light-glass'>
          <DotLoading color='primary' />
          <Text className='state-title'>生成志愿方案</Text>
          <Text className='state-desc'>分析历年数据，计算录取概率中</Text>
        </View>
      </View>
    )
  }

  if (needProfile) {
    return (
      <View className='recommend-need-profile'>
        <View className='recommend-layout-bg' />
        <View className='state-card light-glass state-card-large'>
          <View className='state-icon-wrap'>
            <Text className='state-icon'>✨</Text>
          </View>
          <Text className='state-title-large'>开启智能推荐</Text>
          <Text className='state-desc-large'>
            为了提供精准的冲稳保志愿方案，我们需要了解您的成绩和偏好信息。
          </Text>
          <Button block type='primary' onClick={() => Taro.navigateTo({ url: '/pages/profile/index' })} className='btn-action'>
            完善个人档案 →
          </Button>
        </View>
      </View>
    )
  }

  return (
    <ScrollView scrollY className='recommend-page-scroll'>
      <View className='recommend-layout-bg' />

      {/* Section 1: 志愿填报方案 (Portfolios) */}
      <View className='recommend-section'>
        <View className='section-header-modern'>
          <View className='section-title-row'>
            <Text className='section-heading-modern'>志愿填报方案</Text>
            <View className='section-badge section-badge-portfolio'>
              <Text className='badge-icon'>✨</Text>
              <Text className='badge-text'>组合推荐</Text>
            </View>
          </View>
          <Text className='section-desc-modern'>
            综合历年录取数据与冲稳保策略自动生成，经过 Pareto 最优筛选与风险约束校验，可直接照表填入志愿表。
          </Text>
        </View>

        {portfolioPanels.length > 0 ? (
          <View className='carousel-wrapper portfolio-carousel-wrapper'>
            <View className='carousel-container'>
              {portfolioPanels.map((panel, index) => {
                const animProps = getCarouselTransform(index, activePortfolioIndex)
                const isExpanded = expandedPortfolioDescriptions[panel.id] ?? false

                return (
                  <View
                    key={panel.id}
                    className={`carousel-panel portfolio-panel panel-${panel.tier} ${animProps.isCenter ? 'interactive' : ''}`}
                    style={{
                      transform: `translateX(${animProps.x}%) scale(${animProps.scale})`,
                      zIndex: animProps.zIndex,
                      opacity: animProps.opacity,
                    }}
                    onClick={() => !animProps.isCenter && setActivePortfolioIndex(index)}
                  >
                    {!animProps.isCenter && <View className='panel-overlay' />}

                    <View className='portfolio-card-header'>
                      <View className='panel-title-wrap'>
                        <View className={`panel-icon-wrap panel-icon-${panel.tier}`}>
                          <Text className='panel-icon'>{panel.icon}</Text>
                        </View>
                        <View className='portfolio-title-container' onClick={() => togglePortfolioDescription(panel.id)}>
                          <Text className='panel-title'>{panel.title}</Text>
                          <Text className={`portfolio-title-chevron ${isExpanded ? 'icon-rotated' : ''}`}>▼</Text>
                        </View>
                      </View>
                      <Text className='panel-count'>{panel.portfolio.items.length} 个志愿</Text>
                    </View>

                    <Text className='portfolio-short-desc'>{panel.shortDesc}</Text>

                    {isExpanded && (
                      <View className='portfolio-details-expanded'>
                        <View className='portfolio-summary-grid'>
                          <View className='portfolio-summary-card'>
                            <Text className='portfolio-summary-label'>平均录取率</Text>
                            <Text className='portfolio-summary-value'>{(panel.portfolio.summary.averageAdmissionProbability * 100).toFixed(1)}%</Text>
                          </View>
                          <View className='portfolio-summary-card'>
                            <Text className='portfolio-summary-label'>冲/稳/保比例</Text>
                            <Text className='portfolio-summary-value'>{panel.portfolio.summary.reachCount}/{panel.portfolio.summary.steadyCount}/{panel.portfolio.summary.safeCount}</Text>
                          </View>
                          <View className='portfolio-summary-card'>
                            <Text className='portfolio-summary-label'>风险约束</Text>
                            <Text className={`portfolio-summary-value icon-value ${panel.portfolio.summary.riskConstraintSatisfied ? 'text-success' : 'text-error'}`}>
                              {panel.portfolio.summary.riskConstraintSatisfied ? '✓ 满足' : '✗ 未满足'}
                            </Text>
                          </View>
                          <View className='portfolio-summary-card'>
                            <Text className='portfolio-summary-label'>Pareto最优</Text>
                            <Text className={`portfolio-summary-value icon-value ${panel.portfolio.summary.paretoOptimal ? 'text-success' : 'text-error'}`}>
                              {panel.portfolio.summary.paretoOptimal ? '✓ 是' : '✗ 否'}
                            </Text>
                          </View>
                        </View>

                        {panel.portfolio.explanations.length > 0 && (
                          <View className='portfolio-explanations-card-plain'>
                            <Text className='portfolio-explanations-label'>方案说明：</Text>
                            {panel.portfolio.explanations.map((exp, expIndex) => (
                              <Text key={`${panel.id}-${expIndex}`} className='portfolio-explanation-item'>• {exp}</Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}

                    <ScrollView scrollY className='panel-scroll-area'>
                      <View className='portfolio-card-items'>
                        {panel.portfolio.items.map((item, itemIndex) => {
                          let itemTier: 'reach' | 'steady' | 'safe' = 'steady'
                          if (item.admissionProbability < 0.5) itemTier = 'reach'
                          else if (item.admissionProbability > 0.8) itemTier = 'safe'

                          return (
                            <SchoolCard
                              key={`${panel.id}-${item.schoolId}-${item.groupId}`}
                              item={item}
                              tier={itemTier}
                              index={itemIndex}
                            />
                          )
                        })}
                      </View>
                    </ScrollView>
                  </View>
                )
              })}
            </View>
          </View>
        ) : (
          <View className='section-empty'>
            <Text className='empty-text'>暂无填报方案数据，请稍后再试</Text>
          </View>
        )}
      </View>

      {/* Section 2: 单项志愿推荐 (Volunteers) */}
      <View className='recommend-section'>
        <View className='section-header-modern'>
          <View className='section-title-row'>
            <Text className='section-heading-modern'>优质冲稳保志愿推荐</Text>
            <View className='section-badge section-badge-volunteer'>
              <Text className='badge-icon'>🎯</Text>
              <Text className='badge-text'>单项推荐</Text>
            </View>
          </View>
          <Text className='section-desc-modern'>
            根据您的位次与偏好，从全量院校中精选冲、稳、保三档优质志愿，附带录取概率评估，助您自由搭配个性化方案。
          </Text>
        </View>

        {data ? (
          <View className='carousel-wrapper volunteer-carousel-wrapper'>
            <View className='carousel-container'>
              {panels.map((panel, index) => {
                const animProps = getCarouselTransform(index, activeVolunteerIndex)

                return (
                  <View
                    key={panel.id}
                    className={`carousel-panel volunteer-panel panel-${panel.tier} ${animProps.isCenter ? 'interactive' : ''}`}
                    style={{
                      transform: `translateX(${animProps.x}%) scale(${animProps.scale})`,
                      zIndex: animProps.zIndex,
                      opacity: animProps.opacity,
                    }}
                    onClick={() => !animProps.isCenter && setActiveVolunteerIndex(index)}
                  >
                    {!animProps.isCenter && <View className='panel-overlay' />}

                    <View className='volunteer-panel-header'>
                      <View className='panel-title-wrap'>
                        <View className={`panel-icon-wrap panel-icon-${panel.tier}`}>
                          <Text className='panel-icon'>{panel.icon}</Text>
                        </View>
                        <Text className='panel-title'>{panel.title}</Text>
                      </View>
                      <Text className='panel-count'>{panel.data.length} 所推荐</Text>
                    </View>
                    <Text className='panel-desc'>{panel.desc}</Text>

                    <ScrollView scrollY className='panel-scroll-area'>
                      <View className='volunteer-panel-items'>
                        {panel.data.map((item, i) => (
                          <SchoolCard
                            key={`${item.schoolId}-${item.groupId}`}
                            item={item}
                            tier={panel.tier}
                            index={i}
                          />
                        ))}
                        {panel.data.length === 0 && (
                          <View className='section-empty'>
                            <Text className='empty-text'>暂无{panel.title}推荐</Text>
                          </View>
                        )}
                      </View>
                    </ScrollView>
                  </View>
                )
              })}
            </View>
          </View>
        ) : (
          <View className='section-empty'>
            <Text className='empty-text'>暂无推荐结果，请稍后再试或调整档案信息</Text>
          </View>
        )}
      </View>

      <CustomTabBar />
    </ScrollView>
  )
}