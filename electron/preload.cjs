const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('NJV_API', 'http://127.0.0.1:8765')
