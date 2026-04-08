export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/login/index',
    'pages/register/index',
    'pages/school-list/index',
    'pages/school-detail/index',
    'pages/major-list/index',
    'pages/major-detail/index',
    'pages/score-analysis/index',
    'pages/major-compare/index',
    'pages/recommend/index',
    'pages/chat/index',
    'pages/profile/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#4f46e5',
    navigationBarTitleText: '高考志愿通',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#4f46e5',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        iconPath: 'assets/logo.png',
        selectedIconPath: 'assets/logo.png',
      },
      {
        pagePath: 'pages/school-list/index',
        iconPath: 'assets/logo.png',
        selectedIconPath: 'assets/logo.png',
      },
      {
        pagePath: 'pages/score-analysis/index',
        iconPath: 'assets/logo.png',
        selectedIconPath: 'assets/logo.png',
      },
      {
        pagePath: 'pages/recommend/index',
        iconPath: 'assets/logo.png',
        selectedIconPath: 'assets/logo.png',
      },
      {
        pagePath: 'pages/profile/index',
        iconPath: 'assets/logo.png',
        selectedIconPath: 'assets/logo.png',
      },
    ],
  },
})
