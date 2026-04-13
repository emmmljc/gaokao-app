import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const HIDDEN_ITEMS = [
  { pagePath: '/pages/school-list/index', text: '院校查询', iconKey: 'school' },
  { pagePath: '/pages/score-analysis/index', text: '位次分析', iconKey: 'analysis' },
]

export default function OverflowMenu() {
  const [open, setOpen] = useState(false)

  const handleNavigate = (path: string) => {
    setOpen(false)
    Taro.switchTab({ url: path })
  }

  return (
    <View className="overflow-menu">
      <View
        className="overflow-trigger"
        onClick={() => setOpen(!open)}
      >
        <View className="icon-hamburger" />
      </View>

      {open && (
        <View className="overflow-overlay" onClick={() => setOpen(false)}>
          <View className="overflow-dropdown" onClick={(e) => e.stopPropagation()}>
            {HIDDEN_ITEMS.map((item) => (
              <View
                key={item.pagePath}
                className="overflow-dropdown-item"
                onClick={() => handleNavigate(item.pagePath)}
              >
                <View className={`overflow-dropdown-icon icon-${item.iconKey}`} />
                <Text className="overflow-dropdown-text">{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}