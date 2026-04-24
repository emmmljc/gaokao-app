/**
 * PostCSS 配置 - 微信小程序专用
 * 
 * 修复 WXSS 不兼容的 CSS:
 * 1. 移除 * 通用选择器
 * 2. 移除 ::-webkit-scrollbar 伪元素
 * 3. 移除 backdrop-filter
 * 4. 移除 cursor
 * 5. 移除 user-select
 */

module.exports = {
  plugins: [
    require('autoprefixer')(),
    require('./config/postcss-weapp-fix.js')()
  ]
}
