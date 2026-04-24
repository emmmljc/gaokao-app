/**
 * PostCSS 插件 - 修复微信小程序 WXSS 不兼容的 CSS
 * 
 * 问题：
 * 1. * 通用选择器在微信小程序中不支持
 * 2. ::-webkit-scrollbar 伪元素不支持
 * 3. backdrop-filter 需要特定格式
 * 4. overflow: overlay 不支持
 * 
 * 解决：在构建时移除或替换这些样式
 */

module.exports = () => {
  return {
    postcssPlugin: 'postcss-weapp-fix',
    Rule(rule) {
      // 移除包含 * 选择器的规则（包括 > *, + *, ~ *, * 等所有形式）
      if (rule.selector.includes('*')) {
        // 如果包含 * 但不是伪元素（如 ::before, ::after）
        const hasUniversalSelector = /(^|[\s>+~])\*($|[^a-zA-Z])/.test(rule.selector)
        if (hasUniversalSelector) {
          rule.remove()
          return
        }
      }
      
      // 移除 ::-webkit-scrollbar 相关规则
      if (rule.selector.includes('::-webkit-scrollbar')) {
        rule.remove()
        return
      }
      
      // 移除 :-webkit-any 伪类
      if (rule.selector.includes(':-webkit-any')) {
        rule.remove()
        return
      }
      
      // 移除 @supports 规则（微信小程序不支持）
      if (rule.name === 'supports') {
        rule.remove()
        return
      }
    },
    Declaration(decl) {
      // 移除 backdrop-filter（微信小程序支持不佳）
      if (decl.prop === 'backdrop-filter' || decl.prop === '-webkit-backdrop-filter') {
        decl.remove()
        return
      }
      
      // 移除 overflow: overlay（微信小程序不支持）
      if (decl.prop === 'overflow' && decl.value === 'overlay') {
        decl.value = 'auto'
      }
      
      // 移除 cursor: pointer（在小程序中没有意义）
      if (decl.prop === 'cursor') {
        decl.remove()
        return
      }
      
      // 移除 user-select（微信小程序不支持）
      if (decl.prop === 'user-select' || decl.prop === '-webkit-user-select') {
        decl.remove()
        return
      }
      
      // 移除 -webkit-font-smoothing 和 -moz-osx-font-smoothing
      if (decl.prop === '-webkit-font-smoothing' || decl.prop === '-moz-osx-font-smoothing') {
        decl.remove()
        return
      }
      
      // 移除 overscroll-behavior（微信小程序不支持）
      if (decl.prop === 'overscroll-behavior') {
        decl.remove()
        return
      }
      
      // 移除 scroll-behavior（微信小程序不支持）
      if (decl.prop === 'scroll-behavior') {
        decl.remove()
        return
      }
      
      // 移除 -webkit-tap-highlight-color（微信小程序不支持）
      if (decl.prop === '-webkit-tap-highlight-color') {
        decl.remove()
        return
      }
    }
  }
}

module.exports.postcss = true
