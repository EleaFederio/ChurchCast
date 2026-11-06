const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('churchCast', {
  onProjection(callback) {
    const listener = (_event, content) => {
      if (typeof content === 'string') callback(content)
    }
    ipcRenderer.on('render-slide', listener)
    return () => ipcRenderer.removeListener('render-slide', listener)
  },
  projectSlide(content) {
    if (typeof content === 'string') {
      ipcRenderer.send('update-projection', content)
    }
  },
  youversion: {
    listBibles: (options) => ipcRenderer.invoke('youversion:list-bibles', options),
    getIndex: (bibleId) => ipcRenderer.invoke('youversion:get-index', bibleId),
    getPassage: (options) => ipcRenderer.invoke('youversion:get-passage', options),
  },
})
