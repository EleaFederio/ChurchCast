const { app, BrowserWindow, ipcMain, screen } = require('electron')

const controllerUrl = 'http://localhost:5173'
const audienceUrl = 'http://localhost:5173/#/audience'

let controllerWindow
let audienceWindow

function createControllerWindow() {
  if (controllerWindow && !controllerWindow.isDestroyed()) return

  controllerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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
      nodeIntegration: true,
      contextIsolation: false,
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