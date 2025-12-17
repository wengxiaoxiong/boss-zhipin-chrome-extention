# BOSS 直聘招聘插件

一个功能强大的 Chrome 浏览器扩展，专为 BOSS 直聘平台设计，提供自动打招呼功能，帮助招聘人员高效管理候选人沟通。

## ✨ 主要功能

### 🤖 自动打招呼
- **自动扫描候选人**：在 BOSS 直聘推荐页面自动识别候选人卡片
- **批量打招呼**：自动点击"打招呼"按钮，提高工作效率
- **智能去重**：自动记录已点击的候选人，避免重复操作
- **自动滚动**：自动滚动页面加载更多候选人
- **实时状态**：显示运行状态和已点击数量

### 📊 页面信息获取
- 获取当前页面的标题和 URL
- 支持与 content script 通信获取页面信息

## 🏗️ 项目结构

```
├── src/
│   ├── background/          # 后台服务脚本
│   │   └── background.ts   # 处理 Chrome 存储和消息传递
│   ├── content/            # 内容脚本
│   │   ├── content.ts      # 页面 DOM 操作和自动打招呼逻辑
│   │   └── types.ts        # 类型定义
│   ├── popup/              # 弹窗界面
│   │   ├── index.html      # Popup HTML 入口
│   │   └── popup.tsx       # Popup React 组件
│   ├── sidepanel/          # 侧边栏界面
│   │   ├── index.html      # Sidepanel HTML 入口
│   │   └── sidepanel.tsx   # Sidepanel React 组件
│   ├── index.css           # 全局样式
│   └── App.css             # 应用样式
├── public/                 # 静态资源
│   └── icon-*.png          # 扩展图标
├── dist/                   # 构建输出目录（自动生成）
├── manifest.json           # Chrome 扩展清单文件
├── vite.config.ts          # Vite 构建配置
└── package.json            # 项目依赖配置
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm

### 安装步骤

1. **克隆项目**
```bash
git clone <your-repo-url>
cd boss直聘招聘插件
```

2. **安装依赖**
```bash
pnpm install
```

3. **构建项目**
```bash
pnpm build
```

4. **加载扩展**
   - 打开 Chrome 浏览器，访问 `chrome://extensions/`
   - 开启右上角的"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目的 `dist` 文件夹

### 开发模式

```bash
pnpm dev
```

开发模式下，代码会自动构建到 `dist` 目录。修改代码后，需要在 Chrome 扩展管理页面重新加载扩展才能看到更新。

## 📖 使用指南

### Popup（弹窗）使用

Popup 是点击扩展图标时弹出的窗口界面。

#### 主要功能

1. **打开侧边栏**
   - 点击"在侧边栏中打开"按钮
   - 会在当前标签页打开侧边栏界面
   - 如果当前标签页不支持，会在新标签页打开

2. **获取页面信息**
   - 点击"获取页面信息"按钮
   - 显示当前页面的标题和 URL
   - 需要页面支持 content script 注入

3. **查看当前页面 URL**
   - 自动显示当前活动标签页的 URL

#### 使用场景

- **快速入口**：作为打开侧边栏的快捷方式
- **页面检测**：检查当前页面是否支持扩展功能
- **快速预览**：查看当前页面基本信息

#### 注意事项

- Popup 窗口较小（360px 宽），适合快速操作
- 某些页面（如 `chrome://`、`edge://` 等系统页面）无法注入脚本
- 如果页面使用了严格的内容安全策略（CSP），可能无法正常工作

### Sidepanel（侧边栏）使用

Sidepanel 是扩展的主要功能界面，提供更丰富的交互体验。

#### 主要功能

1. **自动打招呼**
   - **开始**：点击"开始"按钮启动自动打招呼功能
   - **停止**：点击"停止"按钮停止自动打招呼
   - **状态监控**：实时显示运行状态和已点击数量
   - **页面检测**：自动检测是否在正确的页面（BOSS 直聘推荐页面）

2. **页面信息**
   - 显示当前页面的 URL
   - 获取并显示页面标题和完整 URL

#### 使用步骤

1. **打开侧边栏**
   - 方式一：点击扩展图标，在 Popup 中点击"在侧边栏中打开"
   - 方式二：右键点击扩展图标，选择"在侧边栏中打开"（如果浏览器支持）

2. **使用自动打招呼功能**
   - 访问 BOSS 直聘推荐页面：`https://www.zhipin.com/web/chat/recommend`
   - 在侧边栏中点击"开始"按钮
   - 扩展会自动扫描页面上的候选人卡片并点击"打招呼"按钮
   - 每个候选人点击后等待 5 秒再继续下一个
   - 可以随时点击"停止"按钮停止操作

3. **查看状态**
   - 侧边栏会每 2 秒自动更新状态
   - 显示当前运行状态（运行中/已停止）
   - 显示已点击的候选人数量

#### 功能说明

- **自动滚动**：当处理完当前可见的候选人后，会自动滚动页面加载更多
- **智能去重**：通过候选人 ID 记录已点击的候选人，避免重复点击
- **错误处理**：如果页面结构变化或无法找到元素，会在控制台输出错误信息

#### 适用页面

自动打招呼功能**仅适用于** BOSS 直聘推荐页面：
- `https://www.zhipin.com/web/chat/recommend`
- 页面会在 iframe 中加载实际的推荐内容（`/web/frame/recommend`）

#### 注意事项

- ⚠️ **页面要求**：必须在 BOSS 直聘推荐页面使用，其他页面会显示警告
- ⚠️ **网络延迟**：每个候选人点击后等待 5 秒，避免操作过快被限制
- ⚠️ **页面刷新**：刷新页面后，已点击记录会清空，需要重新开始
- ⚠️ **浏览器兼容性**：需要支持 Manifest V3 的浏览器（Chrome 88+、Edge 88+）

## 🔧 技术架构

### 核心技术栈

- **React 19**：现代化的 React 框架
- **TypeScript**：类型安全的 JavaScript
- **Vite**：快速的构建工具
- **Tailwind CSS**：实用优先的 CSS 框架
- **Chrome Extension Manifest V3**：最新的 Chrome 扩展规范

### 组件通信

扩展使用 Chrome 消息传递 API 进行组件间通信：

```
┌─────────┐         ┌──────────┐         ┌─────────────┐
│ Popup   │ ──────> │ Content  │ <────── │ Background  │
│ Sidepanel│         │  Script  │         │   Worker    │
└─────────┘         └──────────┘         └─────────────┘
     │                    │                      │
     └────────────────────┴──────────────────────┘
              Chrome Message Passing API
```

#### 消息格式

```typescript
// 请求消息
{
  action: 'ping' | 'getPageInfo' | 'startAutoGreet' | 'stopAutoGreet' | 'getAutoGreetStatus'
}

// 响应消息
{
  success: boolean
  data?: unknown
  error?: string
}
```

### Content Script 工作原理

Content Script 运行在页面上下文中，可以：

1. **访问 DOM**：读取和修改页面元素
2. **监听消息**：接收来自 Popup/Sidepanel 的指令
3. **执行操作**：自动点击按钮、滚动页面等
4. **状态管理**：维护已点击候选人的记录

### 自动打招呼流程

```
1. 用户点击"开始"按钮
   ↓
2. Sidepanel 发送 startAutoGreet 消息
   ↓
3. Content Script 接收消息，启动循环
   ↓
4. 查找候选人卡片（多种选择器策略）
   ↓
5. 遍历卡片，检查是否已点击
   ↓
6. 点击"打招呼"按钮
   ↓
7. 等待 5 秒
   ↓
8. 继续下一个候选人
   ↓
9. 处理完后滚动页面加载更多
   ↓
10. 3 秒后重复步骤 4-9
```

## 🛠️ 开发指南

### 代码结构说明

#### Popup (`src/popup/popup.tsx`)

- **职责**：提供快速入口和页面信息预览
- **主要功能**：
  - 打开侧边栏
  - 获取页面信息
  - 显示当前 URL

#### Sidepanel (`src/sidepanel/sidepanel.tsx`)

- **职责**：提供主要功能界面
- **主要功能**：
  - 自动打招呼控制
  - 状态显示和监控
  - 页面信息获取

#### Content Script (`src/content/content.ts`)

- **职责**：在页面上下文中执行操作
- **主要功能**：
  - 查找候选人卡片
  - 点击"打招呼"按钮
  - 管理已点击记录
  - 自动滚动页面

#### Background Worker (`src/background/background.ts`)

- **职责**：处理后台任务和数据存储
- **主要功能**：
  - Chrome Storage 操作
  - 消息路由
  - 扩展生命周期管理

### 添加新功能

1. **在 Content Script 中添加功能**
   ```typescript
   // src/content/content.ts
   if (request.action === 'yourNewAction') {
     // 实现你的逻辑
     sendResponse({ success: true, data: result })
     return true
   }
   ```

2. **在 UI 中调用**
   ```typescript
   // src/sidepanel/sidepanel.tsx 或 src/popup/popup.tsx
   const response = await chrome.tabs.sendMessage(tabId, { 
     action: 'yourNewAction' 
   })
   ```

3. **更新类型定义**
   ```typescript
   // src/content/types.ts
   type MessageAction = 'ping' | 'getPageInfo' | 'yourNewAction' | ...
   ```

### 调试技巧

1. **查看 Content Script 日志**
   - 打开页面，按 F12 打开开发者工具
   - 在 Console 中查看 `[Content Script]` 和 `[Auto Greet]` 开头的日志

2. **查看 Popup/Sidepanel 日志**
   - 右键点击 Popup/Sidepanel，选择"检查"
   - 在 Console 中查看日志

3. **查看 Background Worker 日志**
   - 访问 `chrome://extensions/`
   - 找到扩展，点击"service worker"链接
   - 在打开的开发者工具中查看日志

4. **重新加载扩展**
   - 修改代码后，在 `chrome://extensions/` 页面点击扩展的刷新按钮
   - 如果修改了 content script，还需要刷新目标页面

## 📦 构建和部署

### 构建生产版本

```bash
pnpm build
```

构建输出在 `dist` 目录，包含：
- `popup.html` - Popup 入口
- `sidepanel.html` - Sidepanel 入口
- `content.js` - Content Script
- `background.js` - Background Worker
- `manifest.json` - 扩展清单
- `assets/` - 打包的资源文件
- `icon-*.png` - 扩展图标

### 打包发布

1. 构建项目：`pnpm build`
2. 压缩 `dist` 目录为 zip 文件
3. 在 [Chrome Web Store](https://chrome.google.com/webstore/devconsole) 上传发布

## 🔐 权限说明

扩展需要以下权限：

- `storage`：存储用户数据和设置
- `activeTab`：访问当前活动标签页
- `scripting`：动态注入脚本
- `tabs`：查询和管理标签页
- `sidePanel`：打开侧边栏
- `<all_urls>`：在所有网站上运行 content script

## ⚠️ 注意事项

1. **合规使用**：请遵守 BOSS 直聘的使用条款，合理使用自动功能
2. **频率控制**：自动打招呼有 5 秒延迟，避免操作过快
3. **页面兼容性**：如果 BOSS 直聘页面结构更新，可能需要更新选择器
4. **数据隐私**：扩展不会收集或上传任何用户数据

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 支持

如有问题或建议，请提交 Issue。

---

**Happy Coding! 🚀**
