import { useState, useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import { Form, Input, Button, Toast, Card, Space, Picker, DotLoading } from 'antd-mobile'
import { profileApi } from '@/api/profile'
import type { UserProfile } from '@/types'
import './index.scss'

const SUBJECT_TYPES = ['物理类', '历史类']
const YEARS = [2024, 2025, 2026]
const FIRST_SUBJECTS = ['物理', '历史']
const RESELECT_SUBJECTS = ['化学', '生物', '政治', '地理']
const SCHOOL_LEVELS = ['985', '211', '双一流', '普通本科']

export default function ProfilePage() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const data = await profileApi.get()
        form.setFieldsValue(data)
      } catch {
        Toast.show({ content: '获取个人档案失败', icon: 'fail' })
      } finally {
        setLoading(false)
      }
    })()
  }, [form])

  const onFinish = async (values: Partial<UserProfile>) => {
    try {
      setSaving(true)
      await profileApi.update(values)
      Toast.show({ content: '保存成功', icon: 'success' })
    } catch (error) {
      const text = error instanceof Error ? error.message : '保存失败'
      Toast.show({ content: text, icon: 'fail' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className='profile-loading'>
        <DotLoading color='primary' />
        <Text className='profile-loading-text'>正在加载个人档案...</Text>
      </View>
    )
  }

  return (
    <View className='profile-page'>
      <View className='profile-header'>
        <Text className='profile-title'>个人档案</Text>
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
            <Picker
              options={YEARS.map((v) => ({ label: `${v}年`, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择年份'}
                </View>
              )}
            </Picker>
          </Form.Item>
          <Form.Item name='subjectType' label='选科类型' rules={[{ required: true, message: '请选择选科类型' }]}>
            <Picker
              options={SUBJECT_TYPES.map((v) => ({ label: v, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择选科类型'}
                </View>
              )}
            </Picker>
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
            <Picker
              options={FIRST_SUBJECTS.map((v) => ({ label: v, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择首选科目'}
                </View>
              )}
            </Picker>
          </Form.Item>
          <Form.Item name='subject1Score' label='首选科目成绩'>
            <Input type='number' placeholder='首选科目成绩' clearable />
          </Form.Item>
          <Form.Item name='subject2' label='再选科目一'>
            <Picker
              options={RESELECT_SUBJECTS.map((v) => ({ label: v, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择再选科目一'}
                </View>
              )}
            </Picker>
          </Form.Item>
          <Form.Item name='subject2Score' label='再选科目一成绩'>
            <Input type='number' placeholder='再选科目一成绩' clearable />
          </Form.Item>
          <Form.Item name='subject3' label='再选科目二'>
            <Picker
              options={RESELECT_SUBJECTS.map((v) => ({ label: v, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择再选科目二'}
                </View>
              )}
            </Picker>
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
            <Picker
              options={SCHOOL_LEVELS.map((v) => ({ label: v, value: v }))}
            >
              {(items) => (
                <View className='profile-picker'>
                  {items[0]?.label || '请选择院校层次'}
                </View>
              )}
            </Picker>
          </Form.Item>
          <Form.Item name='employmentIntention' label='就业意向'>
            <Input placeholder='例如：软件开发' clearable />
          </Form.Item>
        </Card>
      </Form>
    </View>
  )
}
