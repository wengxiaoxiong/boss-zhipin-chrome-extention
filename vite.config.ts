import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import { copyFileSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        // 复制 manifest.json 到 dist 目录
        try {
          const distDir = resolve(__dirname, 'dist')
          copyFileSync(resolve(__dirname, 'manifest.json'), resolve(distDir, 'manifest.json'))
          console.log('✓ manifest.json copied')
          
          // 复制图标文件
          const publicDir = resolve(__dirname, 'public')
          const iconFiles = ['icon-16.png', 'icon-48.png', 'icon-128.png']
          iconFiles.forEach(icon => {
            try {
              copyFileSync(resolve(publicDir, icon), resolve(distDir, icon))
              console.log(`✓ ${icon} copied`)
            } catch {
              console.warn(`⚠️  ${icon} not found, please create it`)
            }
          })

          // 处理 popup.html：将 src/popup/index.html 复制到根目录并重命名为 popup.html
          const popupHtmlPath = resolve(distDir, 'src/popup/index.html')
          const targetPopupPath = resolve(distDir, 'popup.html')
          
          if (existsSync(popupHtmlPath)) {
            let htmlContent = readFileSync(popupHtmlPath, 'utf-8')
            
            // 更新路径：将绝对路径 /assets/ 改为相对路径 ./assets/
            // 因为文件从 src/popup/ 移到了根目录，路径需要调整
            htmlContent = htmlContent.replace(/\/assets\//g, './assets/')
            
            writeFileSync(targetPopupPath, htmlContent)
            console.log('✓ popup.html created')
          } else {
            console.warn('⚠️  src/popup/index.html not found')
          }
        } catch (err) {
          console.error('Failed to copy files:', err)
        }
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          return chunkInfo.name === 'content' || chunkInfo.name === 'background'
            ? '[name].js'
            : 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'popup.html') {
            return '[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
})
