# BOSS 直聘招聘插件

一个功能强大的 Chrome 浏览器扩展，专为 BOSS 直聘平台设计，提供自动打招呼功能，帮助招聘人员高效管理候选人沟通。

## ✨ 主要功能

### 🤖 自动打招呼
- **自动扫描候选人**：在 BOSS 直聘推荐页面自动识别候选人卡片
- **批量打招呼**：自动点击"打招呼"按钮，提高工作效率
- **智能去重**：自动记录已点击的候选人，避免重复操作
- **自动滚动**：自动滚动页面加载更多候选人
- **实时状态**：显示运行状态和已点击数量

### 📄 简历收集器（新功能）
- **智能遍历候选人**：自动遍历聊天页面中的每个候选人
- **四种情况自动处理**：
  - 情况0：没有回复 → 跳过
  - 情况1：需要求简历 → 自动点击"求简历"
  - 情况2：对方要发简历 → 自动点击"同意"
  - 情况3：已有简历 → 自动预览并**点击下载**
  - 情况4：已收集过 → 跳过
- **下载简历文件**：自动点击下载按钮，将PDF简历下载到本地
- **IndexedDB存储**：使用浏览器原生数据库记录简历信息（姓名、时间、状态）
- **实时统计**：显示已处理、已获得、已同意、已求简历的数量
- **等待机制**：智能追踪"等待回复"的候选人，自动重试

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

2. **简历收集器**（新功能）
   - **智能收集**：自动遍历聊天页面的候选人并收集简历
   - **四种情况处理**：自动识别并处理不同的简历状态
   - **实时统计**：显示处理进度和各类统计数据
   - **文件下载**：自动下载PDF简历文件到本地
   - **IndexedDB存储**：使用浏览器原生数据库记录简历信息

3. **页面信息**
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

3. **使用简历收集器**（新功能）
   - 访问 BOSS 直聘聊天页面：`https://www.zhipin.com/web/chat/index`
   - 在侧边栏中找到"简历收集器"卡片
   - 点击"开始收集"按钮
   - 扩展会自动遍历所有候选人并智能处理简历
   - 查看实时统计数据（已处理、已获得简历、已同意、已求简历）
   - 可以随时点击"停止"按钮停止收集

4. **查看状态**
   - 侧边栏会每 2 秒自动更新状态
   - 显示当前运行状态（运行中/已停止）
   - 显示相关统计数据

#### 功能说明

- **自动滚动**：当处理完当前可见的候选人后，会自动滚动页面加载更多
- **智能去重**：通过候选人 ID 记录已点击的候选人，避免重复点击
- **错误处理**：如果页面结构变化或无法找到元素，会在控制台输出错误信息

#### 适用页面

**自动打招呼功能**仅适用于 BOSS 直聘推荐页面：
- `https://www.zhipin.com/web/chat/recommend`
- 页面会在 iframe 中加载实际的推荐内容（`/web/frame/recommend`）

**简历收集器**仅适用于 BOSS 直聘聊天页面：
- `https://www.zhipin.com/web/chat/index`
- 可以查看和管理与候选人的对话

#### 注意事项

- ⚠️ **页面要求**：必须在 BOSS 直聘推荐页面使用，其他页面会显示警告
- ⚠️ **网络延迟**：每个候选人点击后等待 5 秒，避免操作过快被限制
- ⚠️ **页面刷新**：刷新页面后，已点击记录会清空，需要重新开始
- ⚠️ **浏览器兼容性**：需要支持 Manifest V3 的浏览器（Chrome 88+、Edge 88+）

## 📄 简历收集器详细说明

### 功能概述

简历收集器是 BOSS 直聘助手的一个核心功能，可以自动遍历聊天页面中的候选人，智能处理不同的简历状态，并自动收集保存简历。

### 使用步骤

1. **打开聊天页面**
   - 访问 `https://www.zhipin.com/web/chat/index`
   - 确保你已经和一些候选人有过沟通

2. **打开侧边栏**
   - 点击浏览器右上角的扩展图标
   - 选择"打开侧边栏"

3. **启动简历收集器**
   - 在侧边栏中找到"简历收集器"卡片
   - 点击"开始收集"按钮

4. **监控收集进度**
   - 查看"已处理候选人"数量
   - 查看"已获得简历"、"已同意"、"已求简历"的统计
   - 当前正在处理的候选人名称会实时显示

5. **停止收集**
   - 点击"停止"按钮即可停止收集

### 智能处理逻辑

简历收集器会自动识别以下 5 种情况并智能处理：

#### 情况 0：没有回复
- **识别**：你发送了消息，但候选人没有回复
- **处理**：
  - 如果候选人在等待队列中（之前求过简历），保持等待状态，不标记为已处理
  - 如果不在等待队列中，标记为已处理并跳过

#### 情况 1：需要求简历
- **识别**：页面上有"求简历"按钮
- **处理**：
  - 自动点击"求简历"按钮，发送简历请求
  - 将候选人添加到等待队列
  - **不标记为已处理**，以便后续循环继续检查对方是否回复

#### 情况 2：对方要发简历（需要同意）
- **识别**：消息中显示"对方想发送附件简历给您，您是否同意"
- **处理**：
  - 自动点击"同意"按钮
  - 等待 2 秒（简历按钮加载）
  - 重新检查状态，如果有简历则立即处理
  - 从等待队列中移除
  - 标记为已处理

#### 情况 3：已有简历（预览并下载）
- **识别**：消息中有"点击预览附件简历"按钮
- **处理**：
  1. 自动点击预览按钮
  2. 等待 3 秒（预览窗口加载）
  3. 查找下载按钮（使用 3 种策略确保找到）
  4. 点击下载按钮
  5. 等待 1.5 秒（下载开始）
  6. 保存简历信息到 IndexedDB
  7. 关闭预览窗口
  8. 从等待队列中移除
  9. 标记为已处理

#### 情况 4：已收集过
- **识别**：按钮显示为禁用状态（已处理过）
- **处理**：
  - 从等待队列中移除
  - 标记为已处理并跳过

### 完整工作流程示例

#### 场景 1：对方主动发简历
```
1. 检测到: "点击预览附件简历"按钮
   ↓
2. 点击预览按钮 → 等待 3 秒
   ↓
3. 查找下载按钮（3种策略）
   ↓
4. 点击下载按钮 → 等待 1.5 秒
   ↓
5. 保存到 IndexedDB
   ↓
6. 关闭预览窗口
   ↓
7. 标记为已处理 ✓
```

#### 场景 2：我们求简历后对方回复
```
第1次循环:
  └─ 点击"求简历" → 加入等待队列 → 不标记已处理

第2次循环（对方还没回复）:
  └─ 检查候选人 → 仍在等待 → 跳过 → 处理其他候选人

第3次循环（对方回复了）:
  └─ 检查候选人 → 发现有简历了！→ 转到场景1处理
```

#### 场景 3：对方要发简历需要同意
```
1. 检测到: "对方想发送附件简历给您，您是否同意"
   ↓
2. 点击"同意"按钮 → 等待 2 秒
   ↓
3. 重新检查状态 → 发现有简历
   ↓
4. 转到场景1处理
```

### 简历存储

#### 存储方式

所有收集的简历会：
1. **下载PDF文件**：自动下载到浏览器默认下载目录
2. **记录到 IndexedDB**：在数据库中记录简历信息

#### 数据库结构

**数据库名称**: `BossRecruitmentDB`  
**对象存储**: `resumes`

**字段**:
- `id` (自增主键)
- `name` (候选人姓名)
- `timestamp` (收集时间，ISO 8601 格式)
- `status` (状态，默认为 'downloaded')

**索引**:
- `name` - 按姓名查询
- `timestamp` - 按时间排序
- `status` - 按状态筛选

#### 查看已收集的简历

**方法 1: 开发者工具**
1. 打开 Chrome 开发者工具（F12）
2. 选择 **Application** 标签
3. 左侧展开 **IndexedDB** > **BossRecruitmentDB** > **resumes**
4. 可以直接查看、编辑、删除数据

**方法 2: 控制台查询**
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_ALL_RESUMES' },
  (response) => {
    console.table(response.data)
  }
)
```

**方法 3: 导出 JSON**
```javascript
chrome.runtime.sendMessage(
  { type: 'GET_ALL_RESUMES' },
  (response) => {
    const resumes = response.data
    const json = JSON.stringify(resumes, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumes_${new Date().toISOString()}.json`
    a.click()
  }
)
```

**方法 4: 清空数据**
```javascript
chrome.runtime.sendMessage(
  { type: 'CLEAR_ALL_RESUMES' },
  (response) => {
    console.log('简历数据已清空')
  }
)
```

### 技术实现

#### 下载按钮定位策略

由于 BOSS 直聘页面可能更新，我们使用了 3 种策略来定位下载按钮：

**策略 1: SVG 图标 ID**
```html
<use xlink:href="#icon-attacthment-download"></use>
```

**策略 2: class + SVG 检查**
```html
<div class="icon-content">
  <svg class="boss-svg">
    <use href="...download..."></use>
  </svg>
</div>
```

**策略 3: 文本匹配**
查找 textContent 为"下载"的按钮或链接元素

#### 等待机制

简历收集器使用智能等待队列来追踪"正在等待对方回复简历"的候选人：

```typescript
const waitingForResumeCandidates = new Set<string>()

// 求简历后加入等待队列
if (status === ResumeStatus.NEED_REQUEST) {
  await clickRequestResume()
  waitingForResumeCandidates.add(info.id)
  processed = false  // 关键：不标记为已处理
}

// 后续循环重新检查
if (waitingForResumeCandidates.has(info.id)) {
  // 重新检查状态
  // 如果有简历了 → 处理
  // 如果还没有 → 保持等待
}
```

#### IndexedDB 优势

1. **结构化存储**: IndexedDB 提供类似 SQL 的结构化查询能力
2. **大容量**: IndexedDB 没有 5MB 限制（Chrome Storage 的限制）
3. **索引查询**: 支持按姓名、时间、状态快速查询
4. **事务支持**: 保证数据一致性
5. **浏览器原生**: 不需要额外依赖

### 注意事项

1. **下载位置**: 简历文件下载到浏览器默认下载目录
2. **文件命名**: 由 BOSS 直聘页面决定（通常是"候选人姓名 简历.pdf"）
3. **数据持久化**: IndexedDB 数据会永久保存，除非手动清空或卸载扩展
4. **跨域限制**: IndexedDB 数据仅在扩展内部可访问
5. **自动等待时间**：
   - 每选中一个候选人后会等待 1.5 秒加载对话
   - 每处理完一个候选人后会等待 2 秒再继续
   - 简历预览需要等待 3 秒让 PDF 完全加载
   - 下载启动需要等待 1.5 秒
6. **循环间隔**: 当前设置为 3 秒循环一次，如果等待回复的候选人较多，可能需要等待几个循环
7. **网络延迟**: 如果对方回复很慢，会一直保持在等待队列中
8. **性能建议**: 建议一次处理不超过 50 个候选人，如果候选人太多，可以分批次收集

### 故障排查

#### 下载按钮找不到
- **检查**: 控制台日志 `[Resume Collector]`
- **原因**: 可能 BOSS 直聘更新了页面结构
- **解决**: 查看实际 HTML，更新选择器

#### 数据库保存失败
- **检查**: Background script 日志 `[DB]`
- **原因**: IndexedDB 被禁用或版本冲突
- **解决**: 清空数据库或更新版本号

#### 等待候选人一直不处理
- **检查**: 等待队列状态
- **原因**: 对方一直没回复
- **解决**: 正常现象，会持续等待

#### 预览窗口关闭失败
- **检查**: 是否有 `.boss-popup__close` 元素
- **原因**: 页面结构变化
- **解决**: 可能需要更新选择器

### 调试日志

所有操作都有详细的控制台日志：
- `[Resume Collector]` - 简历收集器主流程
- `[DB]` - 数据库操作
- 每个步骤都有 ✅ 成功 或 ❌ 失败 标记

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
// 请求消息（Content Script）
{
  action: 'ping' | 'getPageInfo' | 'startAutoGreet' | 'stopAutoGreet' | 'getAutoGreetStatus' | 
          'startResumeCollector' | 'stopResumeCollector' | 'getResumeCollectorStatus'
}

// 请求消息（Background Worker - IndexedDB）
{
  type: 'SAVE_RESUME_TO_DB' | 'GET_ALL_RESUMES' | 'CLEAR_ALL_RESUMES',
  data?: { name: string, timestamp: string, status: string }
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

### 简历收集器流程

```
1. 用户点击"开始收集"按钮
   ↓
2. Sidepanel 发送 startResumeCollector 消息
   ↓
3. Content Script 接收消息，启动循环
   ↓
4. 遍历所有候选人卡片
   ↓
5. 对每个候选人：
   ├─ 情况0（没有回复）→ 检查等待队列 → 跳过或保持等待
   ├─ 情况1（需要求简历）→ 点击"求简历" → 加入等待队列 → 不标记已处理
   ├─ 情况2（需要同意）→ 点击"同意" → 等待2秒 → 重新检查
   ├─ 情况3（已有简历）→ 预览 → 下载 → 保存到IndexedDB → 关闭窗口
   └─ 情况4（已收集过）→ 跳过
   ↓
6. 等待 2 秒
   ↓
7. 继续下一个候选人
   ↓
8. 处理完后等待 3 秒
   ↓
9. 重复步骤 4-8（会重新检查等待队列中的候选人）
```

### 简历收集器技术实现

#### 核心函数

**previewAndDownloadResume()** - 主流程函数
- 点击预览按钮
- 等待预览窗口加载（3秒）
- 查找并点击下载按钮（3种策略）
- 等待下载开始（1.5秒）
- 保存简历信息到 IndexedDB
- 关闭预览窗口

**clickDownloadButton()** - 下载按钮定位
- 策略1: SVG use 元素的 xlink:href 属性
- 策略2: .icon-content 容器内的 SVG
- 策略3: 文本匹配"下载"

**saveResumeInfo()** - 数据库保存
- 通过消息传递给 background script
- 异步处理，返回保存结果

#### IndexedDB 操作

**Background Script 中的数据库操作**:

- `openDatabase()` - 初始化数据库和表结构
- `saveResumeToDB()` - 插入新记录，返回自增ID
- `getAllResumes()` - 查询所有记录，按时间排序
- `clearAllResumes()` - 清空所有记录

**消息处理**:
```typescript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SAVE_RESUME_TO_DB') {
    saveResumeToDB(request.data)
      .then((id) => sendResponse({ success: true, data: { id } }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
  
  if (request.type === 'GET_ALL_RESUMES') {
    getAllResumes()
      .then((resumes) => sendResponse({ success: true, data: resumes }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
  
  if (request.type === 'CLEAR_ALL_RESUMES') {
    clearAllResumes()
      .then(() => sendResponse({ success: true }))
      .catch((error) => sendResponse({ success: false, error: error.message }))
    return true
  }
})
```

#### 等待机制实现

```typescript
const waitingForResumeCandidates = new Set<string>()

// 求简历后加入等待队列
if (status === ResumeStatus.NEED_REQUEST) {
  await clickRequestResume()
  waitingForResumeCandidates.add(info.id)
  processed = false  // 关键：不标记为已处理
}

// 后续循环重新检查
if (waitingForResumeCandidates.has(info.id)) {
  // 重新检查状态
  // 如果有简历了 → 处理并移除
  // 如果还没有 → 保持等待
}
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
  - 简历收集器主循环
  - 简历状态检测和处理
  - 预览和下载简历
  - 等待队列管理

#### Background Worker (`src/background/background.ts`)

- **职责**：处理后台任务和数据存储
- **主要功能**：
  - Chrome Storage 操作
  - IndexedDB 数据库操作（简历收集器）
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
   - 在 Console 中查看 `[Content Script]`、`[Auto Greet]` 和 `[Resume Collector]` 开头的日志

2. **查看 Popup/Sidepanel 日志**
   - 右键点击 Popup/Sidepanel，选择"检查"
   - 在 Console 中查看日志

3. **查看 Background Worker 日志**
   - 访问 `chrome://extensions/`
   - 找到扩展，点击"service worker"链接
   - 在打开的开发者工具中查看日志
   - 查看 `[DB]` 开头的数据库操作日志

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
- `downloads`：下载简历文件（简历收集器功能）
- `<all_urls>`：在所有网站上运行 content script

## ⚠️ 注意事项

1. **合规使用**：请遵守 BOSS 直聘的使用条款，合理使用自动功能
2. **频率控制**：
   - 自动打招呼有 5 秒延迟，避免操作过快
   - 简历收集器每个候选人处理间隔 2 秒，循环间隔 3 秒
3. **页面兼容性**：如果 BOSS 直聘页面结构更新，可能需要更新选择器
4. **数据隐私**：扩展不会收集或上传任何用户数据
5. **简历存储**：
   - 简历文件下载到浏览器默认下载目录
   - 简历信息存储在本地 IndexedDB 数据库中
   - 数据不会上传到任何服务器
6. **网络依赖**：简历下载需要稳定的网络连接
7. **等待机制**：求简历后，系统会持续等待对方回复，不会遗漏任何简历

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📞 支持

如有问题或建议，请提交 Issue。

---

**Happy Coding! 🚀**
