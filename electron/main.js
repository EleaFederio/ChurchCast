const { app, BrowserWindow, ipcMain, screen } = require('electron')
const { existsSync } = require('node:fs')
const path = require('node:path')
const { createSongsDatabase } = require('./songs-database')

const controllerUrl = 'http://localhost:5173'
const audienceUrl = 'http://localhost:5173/#/audience'
const envFilePath = path.join(__dirname, '..', '.env')

if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath)
}

let controllerWindow
let audienceWindow
let audienceMode = 'live'
let latestProjection = 'For where two or three gather in my name'
let songsDatabase

function getSongsDatabase() {
  if (songsDatabase) return songsDatabase

  const configuredPath = process.env.DATABASE_PATH?.trim()
  const databasePath = configuredPath
    ? path.resolve(__dirname, '..', configuredPath)
    : path.join(app.getPath('userData'), 'churchcast.sqlite')
  songsDatabase = createSongsDatabase(databasePath)
  return songsDatabase
}

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

function isMediaAsset(media) {
  return (
    media &&
    ((media.type === 'image' &&
      typeof media.src === 'string' &&
      /^data:image\/(jpeg|png);base64,/.test(media.src)) ||
      (media.type === 'video' &&
        typeof media.src === 'string' &&
        /^data:video\/mp4;base64,/.test(media.src)))
  )
}

function isProjection(content) {
  return (
    typeof content === 'string' ||
    (content?.type === 'image' && typeof content.src === 'string') ||
    (content?.type === 'media' && isMediaAsset(content.media)) ||
    (content?.type === 'text' &&
      typeof content.content === 'string' &&
      (!content.background || isMediaAsset(content.background))) ||
    (content?.type === 'scripture' &&
      typeof content.reference === 'string' &&
      typeof content.version === 'string' &&
      Array.isArray(content.verses) &&
      content.verses.every(
        (verse) =>
          verse &&
          (typeof verse.number === 'string' || typeof verse.number === 'number') &&
          typeof verse.content === 'string',
      ) &&
      (!content.background || isMediaAsset(content.background))) ||
    (content?.type === 'song' &&
      typeof content.content === 'string' &&
      content.settings &&
      typeof content.settings.fontFamily === 'string' &&
      Number.isFinite(content.settings.fontSize) &&
      typeof content.settings.fontColor === 'string' &&
      /^#[0-9a-f]{6}$/i.test(content.settings.fontColor) &&
      (!content.background || isMediaAsset(content.background)))
  )
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

function syncAudienceWindow() {
  if (!audienceWindow || audienceWindow.isDestroyed()) return
  audienceWindow.webContents.send('audience-mode', audienceMode)
  audienceWindow.webContents.send('render-slide', latestProjection)
}

function getAudienceDisplay() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const extendedDisplay = screen
    .getAllDisplays()
    .find((display) => display.id !== primaryDisplay.id)

  return extendedDisplay || primaryDisplay
}

function createAudienceWindow(openOnPrimary = false) {
  if (audienceWindow && !audienceWindow.isDestroyed()) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const display = getAudienceDisplay()
  const hasExtendedDisplay = display.id !== primaryDisplay.id

  if (!hasExtendedDisplay && !openOnPrimary) return

  audienceWindow = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    frame: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  audienceWindow.loadURL(audienceUrl)
  audienceWindow.webContents.on('did-finish-load', syncAudienceWindow)
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

  ipcMain.handle('songs:list', (event) => {
    assertControllerSender(event)
    return getSongsDatabase().list()
  })

  ipcMain.handle('songs:save', (event, song) => {
    assertControllerSender(event)
    return getSongsDatabase().save(song)
  })

  ipcMain.handle('songs:get-settings', (event) => {
    assertControllerSender(event)
    return getSongsDatabase().getSettings()
  })

  ipcMain.handle('songs:save-settings', (event, settings) => {
    assertControllerSender(event)
    return getSongsDatabase().saveSettings(settings)
  })

  ipcMain.handle('songs:delete', (event, songId) => {
    assertControllerSender(event)
    getSongsDatabase().delete(songId)
  })

  ipcMain.on('show-audience', (event) => {
    if (event.sender !== controllerWindow?.webContents) return
    if (!audienceWindow || audienceWindow.isDestroyed()) createAudienceWindow(true)
    if (!audienceWindow || audienceWindow.isDestroyed()) return

    const display = getAudienceDisplay()
    audienceWindow.setFullScreen(false)
    audienceWindow.setBounds(display.bounds)
    audienceWindow.setFullScreen(true)
    audienceWindow.show()
    audienceWindow.focus()
  })

  ipcMain.on('audience-ready', (event) => {
    if (event.sender !== audienceWindow?.webContents) return
    syncAudienceWindow()
  })

  ipcMain.on('close-audience', (event) => {
    if (event.sender !== audienceWindow?.webContents) return
    audienceWindow.close()
  })

  ipcMain.on('set-audience-mode', (event, mode) => {
    if (
      event.sender !== controllerWindow?.webContents ||
      !['live', 'freeze', 'black'].includes(mode)
    ) {
      return
    }
    audienceMode = mode
    syncAudienceWindow()
  })

  ipcMain.on('update-projection', (event, slideContent) => {
    if (event.sender !== controllerWindow?.webContents || !isProjection(slideContent)) {
      return
    }
    latestProjection = slideContent
    if (audienceMode !== 'live' || !audienceWindow || audienceWindow.isDestroyed()) return
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

app.on('will-quit', () => {
  songsDatabase?.close()
  songsDatabase = undefined
})