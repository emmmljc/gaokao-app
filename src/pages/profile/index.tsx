import { useState, useEffect } from 'react'
import { View, Text, Picker as TaroPicker } from '@tarojs/components'
import { Form, Input, Button, Toast, Card, DotLoading, PullToRefresh } from 'antd-mobile'
import { profileApi } from '@/api/profile'
import type { UserProfile } from '@/types'
import { useSwipeTab } from '@/hooks/useSwipeTab'
import CustomTabBar from '@/custom-tab-bar'
import OverflowMenu from '@/components/OverflowMenu'
import './index.scss'

const YEARS = [2024, 2025, 2026]
const SUBJECT_TYPES = ['物理类', '历史类']
const FIRST_SUBJECTS = ['物理', '历史']
const RESELECT_SUBJECTS = ['化学', '生物', '政治', '地理']
const SCHOOL_LEVELS = ['985', '211', '双一流', '普通本科']

type PickerField = 'examYear' | 'subjectType' | 'subject1' | 'subject2' | 'subject3' | 'schoolLevelRange'

const PICKER_LABELS: Record<PickerField, string> = {
  examYear: '请选择年份',
  subjectType: '请选择选科类型',
  subject1: '请选择首选科目',
  subject2: '请选择再选科目一',
  subject3: '请选择再选科目二',
  schoolLevelRange: '请选择院校层次',
}

const PICKER_RANGE: Record<PickerField, string[]> = {
  examYear: YEARS.map(String),
  subjectType: SUBJECT_TYPES,
  subject1: FIRST_SUBJECTS,
  subject2: RESELECT_SUBJECTS,
  subject3: RESELECT_SUBJECTS,
  schoolLevelRange: SCHOOL_LEVELS,
}

function displayValue(field: PickerField, value: string | number | undefined): string {
  if (value === undefined || value === null || value === '') return PICKER_LABELS[field]
  const range = PICKER_RANGE[field]
  const strVal = String(value)
  const idx = range.findIndex((v) => v === strVal)
  if (idx < 0) return PICKER_LABELS[field]
  if (field === 'examYear') return `${range[idx]}年`
  return range[idx]
}

export default function ProfilePage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Track picker display values in state so they re-render on change
  const [pickerValues, setPickerValues] = useState<Record<PickerField, string | number | undefined>>({
    examYear: undefined,
    subjectType: undefined,
    subject1: undefined,
    subject2: undefined,
    subject3: undefined,
    schoolLevelRange: undefined,
  })

  const swipeHandlers = useSwipeTab()

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await profileApi.get()
        form.setFieldsValue(data)
        // Sync picker state from loaded data
        setPickerValues({
          examYear: data.examYear,
          subjectType: data.subjectType,
          subject1: data.subject1,
          subject2: data.subject2,
          subject3: data.subject3,
          schoolLevelRange: data.schoolLevelRange,
        })
      } catch {
        Toast.show({ content: '获取个人档案失败', icon: 'fail' })
      } finally {
        setLoading(false)
      }
    })()
  }, [form])

  /** Clean form values before sending to backend:
   *  - Convert empty strings to null for numeric fields
   *  - Convert preferredCities/preferredMajors from string to string[]
   *  - Remove undefined fields
   */
  const cleanFormValues = (raw: Record<string, any>): Partial<UserProfile> => {
    const numericFields = ['totalScore', 'rankPosition', 'chineseScore', 'mathScore', 'englishScore', 'subject1Score', 'subject2Score', 'subject3Score']
    const result: Record<string, any> = {}

    for (const [key, value] of Object.entries(raw)) {
      if (value === undefined) continue

      if (numericFields.includes(key)) {
        // Convert empty string or NaN to null, otherwise parse as number
        if (value === '' || value === null || value === undefined) {
          continue // omit null numeric fields
        }
        const num = Number(value)
        if (isNaN(num)) continue
        result[key] = num
        continue
      }

      if (key === 'preferredCities' || key === 'preferredMajors') {
        // Backend expects String[], convert comma-separated string or single string
        if (Array.isArray(value)) {
          result[key] = value
        } else if (typeof value === 'string' && value.trim()) {
          result[key] = value.split(/[,，、\s]+/).map((s: string) => s.trim()).filter(Boolean)
        } else {
          result[key] = []
        }
        continue
      }

      result[key] = value
    }

    return result as Partial<UserProfile>
  }

  const onFinish = async (rawValues: Record<string, any>) => {
    try {
      setSaving(true)
      const values = cleanFormValues(rawValues)
      await profileApi.update(values)
      Toast.show({ content: '保存成功', icon: 'success' })
    } catch (error) {
      const text = error instanceof Error ? error.message : '保存失败'
      Toast.show({ content: text, icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  const handlePickerChange = (field: PickerField) => (e) => {
    const range = PICKER_RANGE[field]
    const idx = e.detail.value as number
    const selected = range[idx]
    const value = field === 'examYear' ? Number(selected) : selected
    form.setFieldValue(field, value)
    setPickerValues((prev) => ({ ...prev, [field]: value }))
  }

  if (loading) {
    return (
      <View className='profile-loading' {...swipeHandlers}>
        <DotLoading color='primary' />
        <Text className='profile-loading-text'>正在加载个人档案...</Text>
      </View>
    )
  }

  return (
    <View className='profile-page' {...swipeHandlers}>
      <PullToRefresh onRefresh={async () => {
        try {
          const profile = await profileApi.get()
          if (profile) setProfile(profile)
        } catch { /* silently ignore */ }
      }}>
<View className='profile-header'>
          <View className='profile-header-row'>
            <Text className='profile-title'>个人档案</Text>
            <OverflowMenu />
          </View>
        <Text className='profile-subtitle'>完善您的档案，获取更精准的志愿推荐</Text>
      </View>

      <Form
        form={form}
        layout='vertical'
        onFinish={onFinish}
        footer={
          <View className='profile-footer'>
            <Button block type='primary' htmlType='submit' loading={saving} className='profile-save-btn'>
              保存档案
            </Button>
          </View>
        }
      >
        {/* 基本信息 */}
        <Card className='profile-card' title='基本信息'>
          <Form.Item name='province' label='省份'>
            <Input placeholder='例如：江苏' clearable />
          </Form.Item>
          <Form.Item name='examYear' label='高考年份' rules={[{ required: true, message: '请选择高考年份' }]}>
            <TaroPicker mode='selector' range={PICKER_RANGE.examYear} onChange={handlePickerChange('examYear')}>
              <View className='profile-picker'>
                {displayValue('examYear', pickerValues.examYear)}
              </View>
            </TaroPicker>
          </Form.Item>
          <Form.Item name='subjectType' label='选科类型' rules={[{ required: true, message: '请选择选科类型' }]}>
            <TaroPicker mode='selector' range={PICKER_RANGE.subjectType} onChange={handlePickerChange('subjectType')}>
              <View className='profile-picker'>
                {displayValue('subjectType', pickerValues.subjectType)}
              </View>
            </TaroPicker>
          </Form.Item>
        </Card>

        {/* 成绩信息 */}
        <Card className='profile-card' title='成绩信息'>
          <Form.Item name='totalScore' label='总分'>
            <Input type='number' placeholder='总分' clearable />
          </Form.Item>
          <Form.Item name='rankPosition' label='全省位次'>
            <Input type='number' placeholder='您的全省排名' clearable />
          </Form.Item>
          <Form.Item name='chineseScore' label='语文'>
            <Input type='number' placeholder='语文成绩' clearable />
          </Form.Item>
          <Form.Item name='mathScore' label='数学'>
            <Input type='number' placeholder='数学成绩' clearable />
          </Form.Item>
          <Form.Item name='englishScore' label='英语'>
            <Input type='number' placeholder='英语成绩' clearable />
          </Form.Item>
          <Form.Item name='subject1' label='首选科目'>
            <TaroPicker mode='selector' range={PICKER_RANGE.subject1} onChange={handlePickerChange('subject1')}>
              <View className='profile-picker'>
                {displayValue('subject1', pickerValues.subject1)}
              </View>
            </TaroPicker>
          </Form.Item>
          <Form.Item name='subject1Score' label='首选科目成绩'>
            <Input type='number' placeholder='首选科目成绩' clearable />
          </Form.Item>
          <Form.Item name='subject2' label='再选科目一'>
            <TaroPicker mode='selector' range={PICKER_RANGE.subject2} onChange={handlePickerChange('subject2')}>
              <View className='profile-picker'>
                {displayValue('subject2', pickerValues.subject2)}
              </View>
            </TaroPicker>
          </Form.Item>
          <Form.Item name='subject2Score' label='再选科目一成绩'>
            <Input type='number' placeholder='再选科目一成绩' clearable />
          </Form.Item>
          <Form.Item name='subject3' label='再选科目二'>
            <TaroPicker mode='selector' range={PICKER_RANGE.subject3} onChange={handlePickerChange('subject3')}>
              <View className='profile-picker'>
                {displayValue('subject3', pickerValues.subject3)}
              </View>
            </TaroPicker>
          </Form.Item>
          <Form.Item name='subject3Score' label='再选科目二成绩'>
            <Input type='number' placeholder='再选科目二成绩' clearable />
          </Form.Item>
        </Card>

        {/* 报考意向 */}
        <Card className='profile-card' title='报考意向'>
          <Form.Item name='preferredCities' label='意向城市'>
            <Input placeholder='输入城市后回车' clearable />
          </Form.Item>
          <Form.Item name='preferredMajors' label='意向专业'>
            <Input placeholder='输入专业后回车' clearable />
          </Form.Item>
          <Form.Item name='schoolLevelRange' label='院校层次偏好'>
            <TaroPicker mode='selector' range={PICKER_RANGE.schoolLevelRange} onChange={handlePickerChange('schoolLevelRange')}>
              <View className='profile-picker'>
                {displayValue('schoolLevelRange', pickerValues.schoolLevelRange)}
              </View>
            </TaroPicker>
          </Form.Item>
          <Form.Item name='employmentIntention' label='就业意向'>
            <Input placeholder='例如：软件开发' clearable />
          </Form.Item>
        </Card>
      </Form>

      </PullToRefresh>
      <CustomTabBar />
    </View>
  )
}