import { useEffect, useState } from 'react'
import { Check, Ellipsis, ImagePlus, Plus, Upload, Video, X } from 'lucide-react'

const allowedTypes = new Map([
  ['image/jpeg', 'image'],
  ['image/png', 'image'],
  ['video/mp4', 'video'],
])

function getMediaType(file) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  const extensionType = {
    jpg: 'image',
    jpeg: 'image',
    png: 'image',
    mp4: 'video',
  }[extension]

  if (allowedTypes.has(file.type)) return allowedTypes.get(file.type)
  return file.type ? null : extensionType || null
}

function readMediaFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(`Unable to read ${file.name}.`))
        return
      }
      const extension = file.name.split('.').pop()?.toLowerCase()
      const mediaType = allowedTypes.get(file.type) ||
        ({ jpg: 'image', jpeg: 'image', png: 'image', mp4: 'video' }[extension])
      const mimeType = file.type || (mediaType === 'video' ? 'video/mp4' : extension === 'png' ? 'image/png' : 'image/jpeg')
      resolve(reader.result.replace(/^data:[^;,]*/, `data:${mimeType}`))
    }
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`))
    reader.readAsDataURL(file)
  })
}

export default function MediaPage({
  mediaFiles,
  isLoadingMedia,
  mediaStorageError,
  onUpload,
  onProject,
  onSetBackground,
  onSetBase,
  onClearBase,
  backgrounds,
  baseMedia,
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isModalOpen && openMenuId === null) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
        setOpenMenuId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen, openMenuId])

  useEffect(() => {
    if (openMenuId === null) return undefined

    function closeMenu(event) {
      if (!event.target.closest('[data-media-menu-owner]')) setOpenMenuId(null)
    }

    window.addEventListener('pointerdown', closeMenu)
    return () => window.removeEventListener('pointerdown', closeMenu)
  }, [openMenuId])

  async function handleFileChange(event) {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')
    if (!files.length) return

    const validFiles = []
    const invalidNames = []
    for (const file of files) {
      const type = getMediaType(file)
      if (type) validFiles.push({ file, type })
      else invalidNames.push(file.name)
    }

    setIsReading(true)
    try {
      const uploads = await Promise.all(
        validFiles.map(async ({ file, type }) => ({
          id: window.crypto.randomUUID(),
          name: file.name,
          type,
          src: await readMediaFile(file),
        })),
      )
      if (uploads.length) await onUpload(uploads)
      if (invalidNames.length) {
        setError(`Unsupported file${invalidNames.length > 1 ? 's' : ''}: ${invalidNames.join(', ')}. Use JPEG, PNG, or MP4.`)
      } else {
        setIsModalOpen(false)
      }
    } catch (readError) {
      console.error('Unable to upload the selected media files.', readError)
      setError(readError.message || 'Unable to upload the selected files.')
    } finally {
      setIsReading(false)
    }
  }

  return (
    <main className="relative min-h-full text-zinc-100">
      <h1 className="text-3xl font-semibold">Media &amp; Backgrounds Engine</h1>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">
        Upload JPEG, PNG, or MP4 files to display them or use them as backgrounds.
      </p>

      {mediaStorageError && (
        <p role="alert" className="mt-4 rounded-md border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
          {mediaStorageError}
        </p>
      )}
      {isLoadingMedia && (
        <p role="status" className="mt-4 text-xs text-zinc-500">
          Loading saved media...
        </p>
      )}

      {mediaFiles.length ? (
        <section aria-label="Uploaded media" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mediaFiles.map((media) => {
            const isBase = baseMedia?.id === media.id
            const backgroundFor = Object.entries(backgrounds).find(
              ([, background]) => background?.id === media.id,
            )?.[0]

            return (
              <article
                key={media.id}
                className="overflow-visible rounded-xl border border-zinc-800 bg-zinc-900/80"
              >
                <div className="relative aspect-video overflow-hidden rounded-t-xl bg-black">
                  {media.type === 'video' ? (
                    <video
                      src={media.src}
                      aria-label={media.name}
                      className="size-full object-contain"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img src={media.src} alt={media.name} className="size-full object-contain" />
                  )}
                  {isBase && (
                    <span className="absolute left-2 top-2 rounded-full bg-sky-500/90 px-2 py-1 text-[10px] font-semibold text-white">
                      Base
                    </span>
                  )}
                  {backgroundFor && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-zinc-950/85 px-2 py-1 text-[10px] font-semibold text-zinc-200">
                      {backgroundFor === 'song' ? 'Song background' : 'Scripture background'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 p-3">
                  {media.type === 'video' ? (
                    <Video size={15} className="shrink-0 text-zinc-500" aria-hidden="true" />
                  ) : (
                    <ImagePlus size={15} className="shrink-0 text-zinc-500" aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-200" title={media.name}>
                    {media.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Display ${media.name}`}
                    title="Display on audience"
                    onClick={() => onProject(media)}
                    className="grid size-8 shrink-0 place-items-center rounded-md bg-sky-500 text-white transition hover:bg-sky-400"
                  >
                    <Plus size={17} aria-hidden="true" />
                  </button>
                  <div className="relative" data-media-menu-owner={media.id}>
                    <button
                      type="button"
                      aria-label={`Options for ${media.name}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenuId === media.id}
                      onClick={() => setOpenMenuId((current) => current === media.id ? null : media.id)}
                      className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                    >
                      <Ellipsis size={18} aria-hidden="true" />
                    </button>
                    {openMenuId === media.id && (
                      <div
                        role="menu"
                        aria-label={`Options for ${media.name}`}
                        className="absolute right-0 top-full z-20 mt-1 w-56 rounded-lg border border-zinc-700 bg-zinc-900 p-1 shadow-xl shadow-black/40"
                      >
                        {[
                          ['song', 'Set as song background'],
                          ['scripture', 'Set as scripture background'],
                        ].map(([context, label]) => {
                          const isSelected = backgrounds[context]?.id === media.id
                          return (
                            <button
                              key={context}
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                onSetBackground(context, isSelected ? null : media)
                                setOpenMenuId(null)
                              }}
                              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                            >
                              {isSelected ? `Remove ${context} background` : label}
                              {isSelected && <Check size={14} aria-hidden="true" />}
                            </button>
                          )
                        })}
                        <div className="my-1 border-t border-zinc-800" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            if (isBase) onClearBase()
                            else onSetBase(media)
                            setOpenMenuId(null)
                          }}
                          className="w-full rounded-md px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          {isBase ? 'Clear base' : 'Set as base'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          Your uploaded photos and videos will appear here.
        </div>
      )}

      <button
        type="button"
        aria-label="Upload media"
        title="Upload media"
        onClick={() => {
          setError('')
          setIsModalOpen(true)
        }}
        disabled={isLoadingMedia}
        className="fixed bottom-6 right-[21rem] z-20 grid size-14 place-items-center rounded-full bg-sky-500 text-white shadow-lg shadow-black/40 transition hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        <ImagePlus size={23} aria-hidden="true" />
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget && !isReading) setIsModalOpen(false)
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-upload-title"
            className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl shadow-black/50"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="media-upload-title" className="text-lg font-semibold text-white">
                  Upload media
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Select one or more JPEG, PNG, or MP4 files.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={isReading}
                onClick={() => setIsModalOpen(false)}
                className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-40"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
            <label
              htmlFor="audience-media-files"
              className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-zinc-950/60 p-4 text-center transition hover:border-sky-500"
            >
              <Upload size={21} className="mb-2 text-zinc-400" aria-hidden="true" />
              <span className="text-sm font-medium text-zinc-200">
                {isReading ? 'Uploading files...' : 'Choose files'}
              </span>
              <span className="mt-1 text-xs text-zinc-500">JPEG, PNG, MP4</span>
              <input
                id="audience-media-files"
                type="file"
                accept=".jpg,.jpeg,.png,.mp4,image/jpeg,image/png,video/mp4"
                multiple
                disabled={isReading}
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
            {error && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {error}
              </p>
            )}
            {mediaFiles.length > 0 && (
              <p className="mt-3 text-xs text-zinc-500">
                {mediaFiles.length} file{mediaFiles.length === 1 ? '' : 's'} in your media library.
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
