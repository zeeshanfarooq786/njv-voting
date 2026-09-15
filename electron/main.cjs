const { app, BrowserWindow } = require('electron')
const path = require('path')
const { startServer } = require('./api-server.cjs')

async function createWindow() {
  const dataDir = path.join(app.getPath('userData'), 'njv')
  await startServer(dataDir, 8765)

  const icon = path.join(__dirname, '..', 'frontend', 'dist', 'logo.png')
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0A3B65',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })
  win.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'))
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())
