const { app, BrowserWindow, ipcMain, screen } = require('electron')
const { existsSync } = require('node:fs')
const path = require('node:path')

const controllerUrl = 'http://localhost:5173'
const audienceUrl = 'http://localhost:5173/#/audience'
const envFilePath = path.join(__dirname, '..', '.env')

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

let controllerWindow
let audienceWindow

function assertControllerSender(event) {
  if (event.sender !== controllerWindow?.webContents) {
    throw new Error('Only the Church Cast controller can access the YouVersion API.')
  }
}

function validateBibleId(bibleId) {
  const numericBibleId = Number(bibleId)
  if (!Number.isSafeInteger(numericBibleId) || numericBibleId <= 0) {
    throw new Error('Invalid YouVersion Bible ID.')
  }
  return numericBibleId
}

async function fetchYouVersionJson(endpoint) {
  const appKey = process.env.APP_KEY
  if (!appKey) {
    throw new Error('YouVersion API key is missing. Add APP_KEY to the project .env file.')
  }

  const response = await fetch(`https://api.youversion.com${endpoint}`, {
    headers: { 'X-YVP-App-Key': appKey },
  })
  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(`YouVersion API request failed (${response.status}): ${responseText.slice(0, 300)}`)
  }

  try {
    return JSON.parse(responseText)
  } catch (error) {
    throw new Error(`YouVersion returned invalid JSON: ${error.message}`, { cause: error })
  }
}

function createControllerWindow() {
  if (controllerWindow && !controllerWindow.isDestroyed()) return

  controllerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  controllerWindow.loadURL(controllerUrl)
  controllerWindow.on('closed', () => {
    controllerWindow = null
  })
}

function createAudienceWindow() {
  if (audienceWindow && !audienceWindow.isDestroyed()) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const secondaryDisplay = screen
    .getAllDisplays()
    .find((display) => display.id !== primaryDisplay.id)

  if (!secondaryDisplay) return

  audienceWindow = new BrowserWindow({
    x: secondaryDisplay.bounds.x,
    y: secondaryDisplay.bounds.y,
    width: secondaryDisplay.bounds.width,
    height: secondaryDisplay.bounds.height,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  audienceWindow.loadURL(audienceUrl)
  audienceWindow.on('closed', () => {
    audienceWindow = null
  })
}

function createWindows() {
  createControllerWindow()
  createAudienceWindow()
}

app.whenReady().then(() => {
  ipcMain.handle('youversion:list-bibles', async (event, options = {}) => {
    assertControllerSender(event)
    const languageRange = options.languageRange
    if (typeof languageRange !== 'string' || !/^[a-zA-Z0-9*-]{1,35}$/.test(languageRange)) {
      throw new Error('Enter a valid Bible language range, such as en or es.')
    }

    const query = new URLSearchParams()
    query.append('language_ranges[]', languageRange)
    query.set('page_size', '99')
    if (options.pageToken) {
      if (typeof options.pageToken !== 'string' || options.pageToken.length > 2048) {
        throw new Error('Invalid Bible catalog page token.')
      }
      query.set('page_token', options.pageToken)
    }
    return fetchYouVersionJson(`/v1/bibles?${query}`)
  })

  ipcMain.handle('youversion:get-index', (event, bibleId) => {
    assertControllerSender(event)
    return fetchYouVersionJson(`/v1/bibles/${validateBibleId(bibleId)}/index`)
  })

  ipcMain.handle('youversion:get-passage', (event, options = {}) => {
    assertControllerSender(event)
    const bibleId = validateBibleId(options.bibleId)
    if (typeof options.passageId !== 'string' || !/^[A-Z0-9]{3}\.\d+\.\d+$/.test(options.passageId)) {
      throw new Error('Select a valid Bible verse.')
    }
    const passageId = encodeURIComponent(options.passageId)
    return fetchYouVersionJson(`/v1/bibles/${bibleId}/passages/${passageId}?format=text`)
  })

  ipcMain.on('update-projection', (event, slideContent) => {
    if (event.sender !== controllerWindow?.webContents || typeof slideContent !== 'string') return
    if (!audienceWindow || audienceWindow.isDestroyed()) return

    audienceWindow.webContents.send('render-slide', slideContent)
  })

  createWindows()

  app.on('activate', () => {
    createWindows()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})