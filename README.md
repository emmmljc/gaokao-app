# 高考志愿通 - 移动端 (gaokao-app)

基于 Taro 框架开发的高考志愿填报系统移动端应用，支持 **H5** 和 **React Native** 双端部署。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | Taro 4.1.11 + React 18 |
| UI 库 | antd-mobile 5 |
| 语言 | TypeScript 5 |
| 样式 | Sass / SCSS |
| 构建 | Webpack 5 |
| 网络 | Axios |
| 目标端 | H5 + React Native (iOS/Android) |

## 项目结构

```
gaokao-app/
├── config/                     # Taro 构建配置
│   ├── index.ts               # 主配置（H5 + RN）
│   ├── dev.ts                 # 开发环境
│   └── prod.ts                # 生产环境
├── src/
│   ├── app.ts                 # 应用入口（全局 Provider）
│   ├── app.config.ts          # 路由 + TabBar 配置
│   ├── app.scss               # 全局样式 + CSS 变量
│   ├── index.html             # H5 入口 HTML
│   ├── types/                 # TypeScript 类型定义
│   │   ├── index.ts           # API 通用类型
│   │   └── chat.ts            # 聊天相关类型
│   ├── api/                   # API 接口层
│   │   ├── client.ts          # Axios 封装（Token 拦截器）
│   │   ├── auth.ts            # 登录/注册
│   │   ├── school.ts          # 院校查询
│   │   ├── major.ts           # 专业查询
│   │   ├── score.ts           # 分数分析
│   │   ├── recommend.ts       # 智能推荐
│   │   ├── majorCompare.ts    # 专业对比分析
│   │   ├── profile.ts         # 个人档案
│   │   └── chat.ts            # AI 助手（SSE 流式）
│   ├── contexts/              # React Context
│   │   ├── AuthContext.tsx    # 认证状态管理
│   │   ├── AuthContextDef.ts  # Context 类型定义
│   │   └── useAuthHook.ts     # useAuth Hook
│   ├── hooks/                 # 自定义 Hooks
│   │   └── useChat.ts         # AI 聊天 Hook（流式 + 会话管理）
│   ├── assets/                # 静态资源
│   │   └── logo.png           # 应用 Logo
│   └── pages/                 # 页面（共 12 个）
│       ├── home/              # 首页（TabBar）
│       ├── login/             # 登录页
│       ├── register/          # 注册页
│       ├── school-list/       # 院校列表（TabBar）
│       ├── school-detail/     # 院校详情
│       ├── major-list/        # 专业列表
│       ├── major-detail/      # 专业详情
│       ├── score-analysis/    # 分数分析（TabBar）
│       ├── major-compare/     # 专业对比分析
│       ├── recommend/         # 智能推荐（TabBar）
│       ├── chat/              # AI 志愿助手
│       └── profile/           # 个人档案
├── package.json
├── babel.config.js
├── tsconfig.json
├── .env                       # 生产环境 API 地址
├── .env.development           # 开发环境 API 地址
├── .eslintrc
└── .stylelintrc
```

## 功能模块

### 1. 用户认证
- 用户名密码登录
- 注册（支持手机号、邮箱）
- Token 自动续期（Axios 拦截器）
- 登录态持久化（Taro Storage）

### 2. 首页
- Hero 区域展示应用核心价值
- 信任数据展示（3000+ 院校、50w+ 数据、99% 满意度）
- 功能卡片快捷入口

### 3. 院校查询
- 关键词搜索
- 多维筛选（省份、类型、985/211/双一流）
- 院校详情（基本信息、历年分数线、开设专业）

### 4. 专业查询
- 专业名称搜索
- 学科门类筛选
- 专业详情（学位、学制、历年录取分数、开设院校）

### 5. 分数分析
- 年份/选科切换
- 分数转位次查询
- 一分一段表数据展示

### 6. 专业对比分析
- 专业族谱选择
- 院校层次/城市筛选
- 稳定性评分、风险评分
- 多年趋势分析

### 7. 智能推荐
- 单项志愿推荐（冲一冲 / 稳一稳 / 保一保）
- 志愿填报方案（冲刺 / 均衡 / 稳妥）
- 录取概率可视化
- 基于个人档案精准推荐

### 8. AI 志愿助手
- SSE 流式对话
- 中间步骤展示（分析过程）
- 智能建议问题
- 自动关联用户档案

### 9. 个人档案
- 基本信息（省份、年份、选科）
- 成绩信息（总分、位次、各科成绩）
- 报考意向（城市、专业、院校层次）

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
cd gaokao-app
npm install
```

### 配置 API 地址

编辑 `.env.development`（开发）或 `.env`（生产）：

```env
TARO_APP_API_BASE_URL=http://localhost:8080/api
```

### 开发模式

#### H5 端

```bash
npm run dev:h5
```

启动后访问 `http://localhost:3000`

#### 微信小程序端

```bash
npm run dev:weapp
```

使用微信开发者工具打开 `dist` 目录

#### React Native 端

```bash
# 首次运行需要安装 RN 对等依赖
npm run upgradePeerdeps

# 启动开发服务器
npm run dev:rn

# 在另一个终端启动 Metro
npm start

# 运行到 Android
npm run android

# 运行到 iOS（需要 macOS）
npm run ios
```

### 构建生产版本

```bash
npm run build:h5      # H5
npm run build:weapp   # 微信小程序
npm run build:rn      # React Native
```

## TabBar 导航

底部 TabBar 包含 5 个主要入口：

| Tab | 页面 | 路径 |
|-----|------|------|
| 🏠 首页 | 首页 | `/pages/home/index` |
| 🏫 院校 | 院校列表 | `/pages/school-list/index` |
| 📊 分数 | 分数分析 | `/pages/score-analysis/index` |
| 🎯 推荐 | 智能推荐 | `/pages/recommend/index` |
| 👤 我的 | 个人档案 | `/pages/profile/index` |

## 与原 Web 端的差异

| 特性 | Web 端 (gaokao-frontend) | 移动端 (gaokao-app) |
|------|-------------------------|---------------------|
| 框架 | Vite + React Router | Taro 4 + React |
| UI 库 | Ant Design (桌面) | antd-mobile (移动) |
| 存储 | localStorage | Taro Storage API |
| 路由 | React Router | Taro 路由 |
| 图表 | ECharts | 占位提示（RN 不兼容） |
| 动画 | Framer Motion | CSS 动画 |
| 目标端 | 浏览器 | H5 + RN (iOS/Android) |

## 注意事项

1. **图表功能**：ECharts 在 React Native 端不兼容，当前使用占位提示"图表功能暂未支持"
2. **API 地址**：确保后端服务已启动，并正确配置 `.env` 中的 API 地址
3. **RN 环境**：React Native 端需要额外配置 Android Studio / Xcode 开发环境
4. **安全区域**：已适配 iOS 安全区域（safe-area-inset）

## License

MIT
