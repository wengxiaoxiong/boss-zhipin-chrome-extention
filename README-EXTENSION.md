# Chrome 扩展使用说明

这是一个基于 Manifest V3 的 Chrome 扩展，支持：
- ✅ Chrome 存储 (chrome.storage.local)
- ✅ 获取当前页面的 DOM
- ✅ Content Script 注入
- ✅ Background Service Worker
- ✅ Popup 界面

## 开发

### 安装依赖
```bash
pnpm install
```

### 构建扩展
```bash
pnpm build
```

构建完成后，`dist` 目录将包含所有扩展文件。

## 安装到 Chrome

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目的 `dist` 目录

## 功能说明

### 1. Content Script (`src/content/content.ts`)
- 注入到所有网页中
- 监听消息获取页面 DOM
- 支持获取完整 DOM 或特定元素信息

### 2. Background Service Worker (`src/background/background.ts`)
- 处理 Chrome 存储操作
- 支持保存、读取、清除数据
- 扩展安装时自动初始化

### 3. Popup 界面 (`src/popup/popup.tsx`)
- 点击扩展图标打开
- 可以获取当前页面的 DOM 信息
- 管理 Chrome 存储数据

## 图标文件

请将以下尺寸的图标文件放置在 `public` 目录：
- `icon-16.png` (16x16)
- `icon-48.png` (48x48)
- `icon-128.png` (128x128)

可以使用 `public/icon.svg` 转换为 PNG 格式。

## API 使用示例

### 从 Popup 获取 DOM
```typescript
const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
const response = await chrome.tabs.sendMessage(tab.id, { action: 'getDOM' })
```

### 保存数据到存储
```typescript
await chrome.runtime.sendMessage({
  action: 'saveData',
  key: 'myKey',
  value: { data: 'value' }
})
```

### 从存储读取数据
```typescript
const response = await chrome.runtime.sendMessage({
  action: 'getData',
  key: 'myKey'
})
```

## 项目结构

```
xhs-ext/
├── manifest.json          # Manifest V3 配置
├── src/
│   ├── content/           # Content Script
│   │   └── content.ts
│   ├── background/        # Background Service Worker
│   │   └── background.ts
│   ├── popup/             # Popup 界面
│   │   ├── index.html
│   │   └── popup.tsx
│   └── ...
├── public/                # 静态资源（图标等）
└── dist/                  # 构建输出目录
```

