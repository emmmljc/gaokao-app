import { View, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useAuth } from '@/contexts/useAuthHook'
import './index.scss'

const TAB_LIST = [
  { 
    pagePath: '/pages/home/index', 
    text: '首页',
    icon: '/assets/tabbar/home.png',
    iconActive: '/assets/tabbar/home-active.png'
  },
  { 
    pagePath: '/pages/major-compare/index', 
    text: '专业',
    icon: '/assets/tabbar/major.png',
    iconActive: '/assets/tabbar/major-active.png'
  },
  { 
    pagePath: '/pages/recommend/index', 
    text: '推荐',
    icon: '/assets/tabbar/recommend.png',
    iconActive: '/assets/tabbar/recommend-active.png'
  },
  { 
    pagePath: '/pages/profile/index', 
    text: '我的',
    icon: '/assets/tabbar/profile.png',
    iconActive: '/assets/tabbar/profile-active.png'
  },
]

export default function CustomTabBar() {
  const currentPages = Taro.getCurrentPages()
  const currentPath = currentPages.length > 0
    ? `/${currentPages[currentPages.length - 1].path}`
    : ''

  const { user } = useAuth()

  const handleSwitch = (path: string) => {
    Taro.switchTab({ url: path })
  }

  return (
    <View className="custom-tabbar">
      <View className="tabbar-inner">
        {TAB_LIST.map((item) => {
          const isActive = currentPath === item.pagePath
            || (item.pagePath === '/pages/home/index' && currentPath === '/')
          return (
            <View
              key={item.pagePath}
              className={`tabbar-item ${isActive ? 'tabbar-item-active' : ''}`}
              onClick={() => handleSwitch(item.pagePath)}
            >
              <View className="tabbar-icon-wrapper">
                <Image
                  className="tabbar-icon"
                  src={isActive ? item.iconActive : item.icon}
                  mode="aspectFit"
                  style={{ width: '22px', height: '22px' }}
                />
                {isActive && <View className="tabbar-active-dot" />}
              </View>
              <View className={`tabbar-text ${isActive ? 'tabbar-text-active' : ''}`}>
                {item.text}
              </View>
              {item.pagePath === '/pages/profile/index' && !user && (
                <View className="tabbar-badge" />
              )}
            </View>
          )
        })}
      </View>
      <View className="tabbar-safe-area" />
    </View>
  )
}
