# 微信小程序适配说明

## 概述

本项目已成功适配**微信小程序**，可以同时在以下三个平台运行：
- **H5** - 浏览器访问
- **React Native** - iOS/Android 原生应用
- **微信小程序** - WeChat Mini Program

## 快速开始

### 1. 开发模式

```bash
# 启动微信小程序开发模式
npm run dev:weapp
```

启动后，使用**微信开发者工具**打开项目根目录的 `dist` 文件夹即可预览。

### 2. 生产构建

```bash
# 构建微信小程序生产版本
npm run build:weapp
```

构建产物位于 `dist/` 目录，可直接上传至微信公众平台。

### 3. 微信开发者工具设置

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具
3. 选择「导入项目」
4. 选择本项目根目录下的 `dist` 文件夹
5. 输入你的小程序 AppID（如果没有，可选择「测试号」）
6. 点击「导入」即可预览

## 适配详情

### 已完成的适配工作

#### 1. 构建配置 (`config/index.ts`)
- ✅ 添加 `weapp` 配置块
- ✅ 配置 postcss pxtransform（适配小程序 rpx）
- ✅ 配置 CSS Modules 支持
- ✅ 配置 webpack 路径解析

#### 2. 应用配置 (`src/app.config.ts`)
- ✅ 添加微信小程序导航栏配置
- ✅ 配置页面背景色
- ✅ 启用按需加载 (`lazyCodeLoading`)
- ✅ 配置自定义 TabBar

#### 3. 平台适配 (`src/app.tsx`)
- ✅ 使用 `getEnv()` 检测运行环境
- ✅ 微信小程序中禁用 Android 返回键处理（小程序有自己的导航逻辑）

#### 4. Chat AI 流式响应 (`src/api/chat.ts`)
- ✅ 添加 `isWeapp()` 环境检测
- ✅ 微信小程序中使用 fetch 完整响应模式（小程序 SSE 流式支持有限）
- ✅ 保持其他平台（H5、RN）的流式响应体验

#### 5. 样式适配
- ✅ 全局样式使用 `page` 选择器（微信小程序专用）
- ✅ 安全区域适配 (`env(safe-area-inset-*)`)
- ✅ backdrop-filter 模糊效果（小程序支持良好）
- ✅ 自定义 TabBar 使用 SVG 图标（通过 React 组件渲染）

#### 6. 配置文件
- ✅ 创建 `project.config.json`（微信开发者工具配置）
- ✅ 创建 `src/sitemap.json`（小程序索引配置）

### 功能对比

| 功能 | H5 | React Native | 微信小程序 |
|------|-----|--------------|-----------|
| 页面路由 | ✅ | ✅ | ✅ |
| TabBar 导航 | ✅ | ✅ | ✅ |
| 自定义 TabBar | ✅ | ✅ | ✅ |
| 用户认证 | ✅ | ✅ | ✅ |
| 院校查询 | ✅ | ✅ | ✅ |
| 专业查询 | ✅ | ✅ | ✅ |
| 分数分析 | ✅ | ✅ | ✅ |
| 智能推荐 | ✅ | ✅ | ✅ |
| AI 助手 | ✅ | ✅ | ✅ |
| 个人档案 | ✅ | ✅ | ✅ |
| 流式响应 | ✅ 实时 | ✅ 完整响应 | ✅ 完整响应 |
| 图表展示 | ✅ | ❌ 占位提示 | ✅ |
| 下拉刷新 | ✅ | ✅ | ✅ |
| 安全区域适配 | ✅ | ✅ | ✅ |

## 注意事项

### 1. 流式响应差异

- **H5/Web**: 支持真正的 SSE 流式响应，文字逐字显示
- **React Native**: 由于 CapacitorHttp 缓冲区限制，显示完整响应
- **微信小程序**: 小程序网络层限制，显示完整响应

### 2. 图表功能

- **H5/微信小程序**: 支持 ECharts 图表展示
- **React Native**: ECharts 不兼容，显示占位提示

### 3. 文件大小

微信小程序有 2MB 单包大小限制（可分包扩展到 20MB）。当前构建产物：
- 主包 vendors.js: ~386KB
- 专业对比页面: ~1MB（建议后续优化分包）

### 4. 样式差异

- **backdrop-filter**: 在小程序中支持良好，但低端机型可能不显示模糊效果
- **安全区域**: 自动适配刘海屏、灵动岛等异形屏幕

## 常见问题

### Q1: 构建后出现 "未找到 app.json" 错误？
A: 确保使用微信开发者工具打开的是 `dist` 目录，而不是项目根目录。

### Q2: 界面空白，WXSS 编译错误？

**错误信息：**
```
[ WXSS 文件编译错误] ./common.wxss(1:10434): error at token `*`
```

**原因：**
微信小程序 WXSS 不支持某些 CSS 语法：
- `*` 通用选择器
- `::-webkit-scrollbar` 伪元素
- `backdrop-filter` 模糊效果
- `cursor: pointer` 光标样式
- `user-select` 文本选择

**解决方案：**
项目已配置 PostCSS 插件自动修复这些问题：
- ✅ 移除 `*` 选择器
- ✅ 移除 `::-webkit-scrollbar`
- ✅ 移除 `backdrop-filter`
- ✅ 移除 `cursor`
- ✅ 移除 `user-select`

配置文件：
- `postcss.config.js` - PostCSS 主配置
- `config/postcss-weapp-fix.js` - 微信小程序专用修复插件

**如果仍有问题，请重新构建：**
```bash
npm run build:weapp
```

### Q3: TabBar 图标大小超过 40KB 错误？

**错误信息：**
```
Error: app.json: ["tabBar"]["list"][0]["iconPath"] 大小超过 40kb
```

**解决方案：**
1. 使用提供的 SVG 源文件（`src/assets/tabbar/*.svg`）
2. 运行转换脚本生成 PNG 图标：
   ```bash
   node scripts/generate-tabbar-icons.js
   ```
3. 重新构建：
   ```bash
   npm run build:weapp
   ```

**图标规范：**
- 尺寸：81x81 像素
- 格式：PNG
- 大小：必须 < 40KB
- 颜色：灰色（未选中）/ 主题色（选中）

**图标列表：**
| 图标 | 未选中 | 选中 |
|------|--------|------|
| 首页 | `home.png` (920 B) | `home-active.png` (966 B) |
| 专业 | `major.png` (362 B) | `major-active.png` (380 B) |
| 推荐 | `recommend.png` (1.1 KB) | `recommend-active.png` (1.2 KB) |
| 我的 | `profile.png` (1.1 KB) | `profile-active.png` (1.1 KB) |

### Q2: 如何设置小程序 AppID？
A: 在 `project.config.json` 中修改 `appid` 字段，或在微信开发者工具中点击「详情」→「修改」进行设置。

### Q3: 小程序可以调用哪些 Taro API？
A: 几乎所有 Taro API 都支持，包括：
- 路由: `navigateTo`, `redirectTo`, `switchTab`
- 存储: `setStorageSync`, `getStorageSync`
- UI: `showToast`, `showModal`, `showLoading`
- 网络: `request`, `downloadFile`, `uploadFile`

### Q4: 如何调试小程序？
A: 使用微信开发者工具的调试器：
1. 点击「调试器」打开 Console
2. 使用 `console.log()` 输出调试信息
3. 使用 Sources 面板断点调试
4. 使用 Network 面板查看网络请求

## 发布流程

1. **开发测试**
   ```bash
   npm run dev:weapp
   ```
   在微信开发者工具中测试功能

2. **生产构建**
   ```bash
   npm run build:weapp
   ```

3. **上传代码**
   - 在微信开发者工具中点击「上传」
   - 填写版本号和项目备注
   - 上传成功后，在[微信公众平台](https://mp.weixin.qq.com)提交审核

4. **提交审核**
   - 登录微信公众平台
   - 进入「版本管理」
   - 找到开发版本，点击「提交审核」

5. **发布上线**
   - 审核通过后，点击「发布」即可上线

## 技术栈

- **框架**: Taro 4.1.11 + React 18
- **UI 库**: antd-mobile 5
- **构建**: Webpack 5
- **样式**: Sass/SCSS
- **语言**: TypeScript 5

## 相关文档

- [Taro 微信小程序文档](https://docs.taro.zone/docs/miniprogram-plugin)
- [微信小程序开发文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [微信开发者工具文档](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html)
