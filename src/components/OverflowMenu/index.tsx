import { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const HIDDEN_ITEMS = [
  { pagePath: '/pages/school-list/index', text: '院校查询', icon: '🏫' },
  { pagePath: '/pages/score-analysis/index', text: '位次分析', icon: '📊' },
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
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
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
                <Text className="overflow-dropdown-icon">{item.icon}</Text>
                <Text className="overflow-dropdown-text">{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}