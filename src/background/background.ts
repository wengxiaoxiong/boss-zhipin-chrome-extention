/* eslint-disable @typescript-eslint/no-explicit-any */
// Background Service Worker - 处理 Chrome 存储
console.log('Background service worker loaded')

interface MessageRequest {
  action: 'saveData' | 'getData' | 'getAllData' | 'clearData'
  type?: string
  key?: string
  value?: any
  data?: any
}

// ==================== IndexedDB 数据库管理 ====================

const DB_NAME = 'BossRecruitmentDB'
const DB_VERSION = 1
const STORE_NAME = 'resumes'

// 初始化数据库
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // 创建简历表
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        
        // 创建索引
        objectStore.createIndex('name', 'name', { unique: false })
        objectStore.createIndex('timestamp', 'timestamp', { unique: false })
        objectStore.createIndex('status', 'status', { unique: false })
        
        console.log('[DB] 数据库表创建成功')
      }
    }
  })
}

// 保存简历信息到数据库
async function saveResumeToDB(resumeInfo: {
  name: string
  timestamp: string
  status: string
}): Promise<number> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.add(resumeInfo)
    
    request.onsuccess = () => {
      console.log('[DB] 简历信息已保存，ID:', request.result)
      resolve(request.result as number)
    }
    
    request.onerror = () => {
      console.error('[DB] 保存失败:', request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => db.close()
  })
}

// 获取所有简历信息
async function getAllResumes(): Promise<any[]> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.getAll()
    
    request.onsuccess = () => {
      console.log('[DB] 查询到', request.result.length, '条简历')
      resolve(request.result)
    }
    
    request.onerror = () => {
      console.error('[DB] 查询失败:', request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => db.close()
  })
}

// 根据姓名查询简历是否存在
async function checkResumeExistsByName(name: string): Promise<boolean> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly')
    const objectStore = transaction.objectStore(STORE_NAME)
    const nameIndex = objectStore.index('name')
    const request = nameIndex.getAll(name)
    
    request.onsuccess = () => {
      const exists = request.result.length > 0
      console.log(`[DB] 查询候选人"${name}"的简历:`, exists ? '已存在' : '不存在')
      resolve(exists)
    }
    
    request.onerror = () => {
      console.error('[DB] 查询失败:', request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => db.close()
  })
}

// 清空简历数据
async function clearAllResumes(): Promise<void> {
  const db = await openDatabase()
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite')
    const objectStore = transaction.objectStore(STORE_NAME)
    const request = objectStore.clear()
    
    request.onsuccess = () => {
      console.log('[DB] 简历数据已清空')
      resolve()
    }
    
    request.onerror = () => {
      console.error('[DB] 清空失败:', request.error)
      reject(request.error)
    }
    
    transaction.oncomplete = () => db.close()
  })
}

// ==================== 消息监听 ====================

// 监听来自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((
  request: MessageRequest,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: any) => void
) => {
  // 处理简历数据库操作
  if (request.type === 'SAVE_RESUME_TO_DB') {
    saveResumeToDB(request.data)
      .then((id) => {
        sendResponse({ success: true, data: { id } })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
  
  if (request.type === 'GET_ALL_RESUMES') {
    getAllResumes()
      .then((resumes) => {
        sendResponse({ success: true, data: resumes })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
  
  if (request.type === 'CHECK_RESUME_EXISTS') {
    checkResumeExistsByName(request.data?.name || '')
      .then((exists) => {
        sendResponse({ success: true, data: { exists } })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
  
  if (request.type === 'CLEAR_ALL_RESUMES') {
    clearAllResumes()
      .then(() => {
        sendResponse({ success: true })
      })
      .catch((error) => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }
  
  // 原有的存储操作
  if (request.action === 'saveData') {
    const { key, value } = request
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' })
      return true
    }
    
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        console.log('Data saved:', key)
        sendResponse({ success: true })
      }
    })
    return true
  }

  if (request.action === 'getData') {
    const { key } = request
    
    if (!key) {
      sendResponse({ success: false, error: 'Key is required' })
      return true
    }
    
    chrome.storage.local.get([key], (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ success: true, data: result[key] })
      }
    })
    return true
  }

  if (request.action === 'getAllData') {
    chrome.storage.local.get(null, (result: { [key: string]: any }) => {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError)
        sendResponse({ success: false, error: chrome.runtime.lastError.message })
      } else {
        sendResponse({ success: true, data: result })
      }
    })
    return true
  }

  if (request.action === 'clearData') {
    const { key } = request
    
    if (key) {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ success: true })
        }
      })
    } else {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError)
          sendResponse({ success: false, error: chrome.runtime.lastError.message })
        } else {
          sendResponse({ success: true })
        }
      })
    }
    return true
  }
})

// 扩展安装时的初始化
chrome.runtime.onInstalled.addListener((details: chrome.runtime.InstalledDetails) => {
  console.log('Extension installed/updated:', details.reason)
  
  // 初始化默认数据
  chrome.storage.local.set({
    installedAt: new Date().toISOString(),
    version: chrome.runtime.getManifest().version,
  })
})

// 注意：当 manifest.json 中配置了 side_panel.default_path 时，
// Chrome 才能提供「在侧边栏打开」等入口；
// action 点击行为由 manifest.action.default_popup 控制（此项目使用 popup 里的按钮触发打开侧边栏）
