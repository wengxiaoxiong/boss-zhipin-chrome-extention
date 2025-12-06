// 简单的图标生成脚本（需要 node-canvas 或使用在线工具）
// 这里提供一个 SVG 模板，你可以手动转换为 PNG
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconSvg = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="#4F46E5"/>
  <text x="64" y="80" font-family="Arial" font-size="48" fill="white" text-anchor="middle" font-weight="bold">XHS</text>
</svg>`;

const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 创建 SVG 图标
fs.writeFileSync(path.join(publicDir, 'icon.svg'), iconSvg);
console.log('✓ Created icon.svg');
console.log('⚠️  Please convert icon.svg to icon-16.png, icon-48.png, icon-128.png');
console.log('   You can use an online tool like https://cloudconvert.com/svg-to-png');

