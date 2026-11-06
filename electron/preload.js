const { contextBridge, ipcRenderer } = require('electron')

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
      (!content.background || isMediaAsset(content.background)))
  )
}

contextBridge.exposeInMainWorld('churchCast', {
  onProjection(callback) {
    const listener = (_event, content) => {
      if (isProjection(content)) callback(content)
    }
    ipcRenderer.on('render-slide', listener)
    return () => ipcRenderer.removeListener('render-slide', listener)
  },
  onAudienceMode(callback) {
    const listener = (_event, mode) => {
      if (mode === 'live' || mode === 'freeze' || mode === 'black') callback(mode)
    }
    ipcRenderer.on('audience-mode', listener)
    return () => ipcRenderer.removeListener('audience-mode', listener)
  },
  projectSlide(content) {
    if (isProjection(content)) ipcRenderer.send('update-projection', content)
  },
  setAudienceMode(mode) {
    if (mode === 'live' || mode === 'freeze' || mode === 'black') {
      ipcRenderer.send('set-audience-mode', mode)
    }
  },
  showAudience() {
    ipcRenderer.send('show-audience')
  },
  readyAudience() {
    ipcRenderer.send('audience-ready')
  },
  youversion: {
    listBibles: (options) => ipcRenderer.invoke('youversion:list-bibles', options),
    getIndex: (bibleId) => ipcRenderer.invoke('youversion:get-index', bibleId),
    getPassage: (options) => ipcRenderer.invoke('youversion:get-passage', options),
  },
})
