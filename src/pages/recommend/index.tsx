import { useState, useEffect, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { Tabs, Card, Button, DotLoading, Toast, CapsuleTabs, Progress, Tag } from 'antd-mobile'
import { profileApi } from '@/api/profile'
import { recommendApi } from '@/api/recommend'
import { useAuth } from '@/contexts/useAuthHook'
import type { RecommendItem, RecommendResponse, UserProfile, PortfolioRecommendResponse, RecommendPortfolio } from '@/types'
import './index.scss'

function hasRequiredProfile(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  return Boolean(profile.examYear && profile.subjectType && profile.rankPosition)
}

function ProbabilityBar({ probability, tier }: { probability: number; tier: string }) {
  const percent = probability * 100
  const color = tier === 'reach' ? '#f59e0b' : tier === 'steady' ? '#3b82f6' : '#10b981'
  return (
    <View className='prob-bar'>
      <View className='prob-bar-bg'>
        <View className='prob-bar-fill' style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
      <Text className='prob-value' style={{ color }}>{percent.toFixed(1)}%</Text>
    </View>
  )
}

function SchoolCard({ item, tier, index }: { item: RecommendItem; tier: string; index: number }) {
  return (
    <View className={`school-card card-${tier}`}>
      <View className='school-card-header'>
        <View className='school-rank-badge'>{index + 1}</View>
        <View className='school-info'>
          <Text className='school-name'>{item.schoolName}</Text>
          <View className='school-tags'>
            {item.schoolLevel && item.schoolLevel !== '普通本科' && (
              <Tag color='blue' fill='outline'>{item.schoolLevel}</Tag>
            )}
            {item.city && <Tag fill='outline'>{item.city}</Tag>}
          </View>
        </View>
      </View>
      <ProbabilityBar probability={item.admissionProbability} tier={tier} />
      {item.majorNames && item.majorNames.length > 0 && (
        <View className='school-majors'>
          <Text className='majors-label'>推荐专业组</Text>
          <View className='majors-list'>
            {item.majorNames.slice(0, 5).map((major, i) => (
              <Tag key={i} fill='outline' className='major-tag'>{major}</Tag>
            ))}
            {item.majorNames.length > 5 && (
              <Text className='major-more'>+{item.majorNames.length - 5}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  )
}

export default function RecommendPage() {
  const { user } = useAuth()
  const [mode, setMode] = useState<'volunteers' | 'portfolios'>('volunteers')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<RecommendResponse | null>(null)
  const [portfolioData, setPortfolioData] = useState<PortfolioRecommendResponse | null>(null)
  const [needProfile, setNeedProfile] = useState(false)

  const normalizedData = {
    reach: Array.isArray(data?.reach) ? data.reach : [],
    steady: Array.isArray(data?.steady) ? data.steady : [],
    safe: Array.isArray(data?.safe) ? data.safe : [],
  }

  const portfolioPanels: Array<{ id: string; tier: string; title: string; portfolio: RecommendPortfolio }> = []
  if (portfolioData?.portfolios) {
    portfolioData.portfolios.forEach((p) => {
      let tier = 'steady'
      let title = '均衡填报方案'
      if (p.style === 'aggressive') { tier = 'reach'; title = '冲刺填报方案' }
      if (p.style === 'conservative') { tier = 'safe'; title = '稳妥填报方案' }
      portfolioPanels.push({ id: p.style, tier, title, portfolio: p })
    })
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const profile = await profileApi.get()
        if (!hasRequiredProfile(profile)) {
          setNeedProfile(true)
          return
        }
        if (mode === 'volunteers') {
          if (!data) {
            const result = await recommendApi.getVolunteers()
            setData(result)
          }
        } else {
          if (!portfolioData) {
            const result = await recommendApi.getPortfolios()
            setPortfolioData(result)
          }
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : '获取推荐结果失败'
        if (text.includes('档案') || text.includes('profile') || text.includes('404') || text.includes('401')) {
          setNeedProfile(true)
        } else {
          Toast.show({ content: text, icon: 'fail' })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [mode])

  const handleGoProfile = useCallback(() => {
    Taro.redirectTo({ url: '/pages/profile/index' })
  }, [])

  if (loading) {
    return (
      <View className='recommend-loading'>
        <DotLoading color='primary' />
        <Text className='loading-text'>生成志愿方案中...</Text>
      </View>
    )
  }

  if (needProfile) {
    return (
      <View className='recommend-need-profile'>
        <View className='profile-prompt-card'>
          <Text className='prompt-title'>开启智能推荐</Text>
          <Text className='prompt-desc'>为了提供精准的冲稳保志愿方案，我们需要了解您的成绩和偏好信息。</Text>
          <Button block type='primary' onClick={handleGoProfile} className='prompt-btn'>
            完善个人档案
          </Button>
        </View>
      </View>
    )
  }

  return (
    <View className='recommend-page'>
      <View className='recommend-header'>
        <Text className='recommend-title'>智能志愿推荐</Text>
        <Text className='recommend-subtitle'>基于大数据多维算法，为您推荐最适合的高校</Text>
      </View>

      <CapsuleTabs
        activeKey={mode}
        onChange={(key) => setMode(key as 'volunteers' | 'portfolios')}
        className='mode-tabs'
      >
        <CapsuleTabs.Tab title='单项志愿' key='volunteers' />
        <CapsuleTabs.Tab title='填报方案' key='portfolios' />
      </CapsuleTabs>

      {mode === 'volunteers' ? (
        <Tabs className='tier-tabs'>
          <Tabs.Tab title={`冲一冲 (${normalizedData.reach.length})`} key='reach'>
            <ScrollView scrollY className='tier-scroll'>
              <View className='tier-content'>
                {normalizedData.reach.map((item, i) => (
                  <SchoolCard key={`${item.schoolId}-${item.groupId}`} item={item} tier='reach' index={i} />
                ))}
                {normalizedData.reach.length === 0 && (
                  <View className='empty-tier'>
                    <Text className='empty-text'>暂无冲刺院校推荐</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Tabs.Tab>
          <Tabs.Tab title={`稳一稳 (${normalizedData.steady.length})`} key='steady'>
            <ScrollView scrollY className='tier-scroll'>
              <View className='tier-content'>
                {normalizedData.steady.map((item, i) => (
                  <SchoolCard key={`${item.schoolId}-${item.groupId}`} item={item} tier='steady' index={i} />
                ))}
                {normalizedData.steady.length === 0 && (
                  <View className='empty-tier'>
                    <Text className='empty-text'>暂无稳妥院校推荐</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Tabs.Tab>
          <Tabs.Tab title={`保一保 (${normalizedData.safe.length})`} key='safe'>
            <ScrollView scrollY className='tier-scroll'>
              <View className='tier-content'>
                {normalizedData.safe.map((item, i) => (
                  <SchoolCard key={`${item.schoolId}-${item.groupId}`} item={item} tier='safe' index={i} />
                ))}
                {normalizedData.safe.length === 0 && (
                  <View className='empty-tier'>
                    <Text className='empty-text'>暂无保底院校推荐</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </Tabs.Tab>
        </Tabs>
      ) : (
        <Tabs className='tier-tabs'>
          {portfolioPanels.map((panel) => (
            <Tabs.Tab title={panel.title} key={panel.id}>
              <ScrollView scrollY className='tier-scroll'>
                <View className='tier-content'>
                  {panel.portfolio.explanations.length > 0 && (
                    <Card className='portfolio-info-card'>
                      <Text className='portfolio-info-text'>{panel.portfolio.explanations[0]}</Text>
                    </Card>
                  )}
                  {panel.portfolio.items.map((item, i) => {
                    let itemTier = 'steady'
                    if (item.admissionProbability < 0.5) itemTier = 'reach'
                    else if (item.admissionProbability > 0.8) itemTier = 'safe'
                    return (
                      <SchoolCard
                        key={`${panel.id}-${item.schoolId}-${item.groupId}`}
                        item={item}
                        tier={itemTier}
                        index={i}
                      />
                    )
                  })}
                  {panel.portfolio.items.length === 0 && (
                    <View className='empty-tier'>
                      <Text className='empty-text'>暂无推荐结果</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </Tabs.Tab>
          ))}
        </Tabs>
      )}
    </View>
  )
}
