import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  EllipsisVertical,
  Music2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import SongEditorModal from '../components/SongEditorModal.jsx'

const starterSongs = [
  { id: 'song-1', title: 'Great Are You Lord', artist: 'All Sons & Daughters' },
  { id: 'song-2', title: 'Goodness of God', artist: 'Bethel Music, Jenn Johnson' },
  { id: 'song-3', title: 'Build My Life', artist: 'Housefires' },
  { id: 'song-4', title: 'In Christ Alone', artist: 'Keith Getty & Stuart Townend' },
]
const SAVED_SONGS_KEY = 'churchcast.songs'

function readSavedSongs() {
  const savedSongs = window.localStorage.getItem(SAVED_SONGS_KEY)
  if (!savedSongs) return starterSongs
  const parsedSongs = JSON.parse(savedSongs)
  if (!Array.isArray(parsedSongs)) {
    throw new Error('The saved song library has an invalid format.')
  }
  return parsedSongs
}

function parseSongSections(lyrics = '') {
  const sections = []
  let currentSection = null
  let introLines = []

  for (const line of lyrics.split(/\r?\n/)) {
    const sectionHeader = line.match(/^\s*\[([^\]]+)\]\s*$/)

    if (sectionHeader) {
      if (currentSection) {
        sections.push({
          label: currentSection.label,
          content: currentSection.lines.join('\n').trim(),
        })
      } else if (introLines.some((introLine) => introLine.trim())) {
        sections.push({ label: 'Intro', content: introLines.join('\n').trim() })
      }

      currentSection = { label: sectionHeader[1].trim(), lines: [] }
      introLines = []
    } else if (currentSection) {
      currentSection.lines.push(line)
    } else {
      introLines.push(line)
    }
  }

  if (currentSection) {
    sections.push({
      label: currentSection.label,
      content: currentSection.lines.join('\n').trim(),
    })
  } else if (introLines.some((line) => line.trim())) {
    sections.push({ label: 'Lyrics', content: introLines.join('\n').trim() })
  }

  return sections
    .filter((section) => section.content)
    .map((section, index) => ({ ...section, id: `slide-${index}` }))
}

function removeChordLines(content) {
  const chordPattern =
    /^[A-G](?:#|b)?(?:maj|min|m|M|dim|aug|sus\d*|add\d*)?(?:\d+(?:sus\d*|add\d*|b\d+|#\d+)?)*(?:\([^)]*\))?(?:\/[A-G](?:#|b)?)?$/i

  return content
    .split(/\r?\n/)
    .filter((line) => {
      const chordTokens = line
        .replace(/[|[\]()]/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)

      return !chordTokens.length || !chordTokens.every((token) => chordPattern.test(token))
    })
    .join('\n')
    .trim()
}

function createProjectionSlides(sections, linesPerSlide) {
  return sections.flatMap((section) => {
    const lyrics = removeChordLines(section.content)
    if (!lyrics) return []

    const lines = lyrics.split(/\r?\n/).filter((line) => line.trim())
    const slideSize = linesPerSlide === 'all' ? lines.length : Number(linesPerSlide)

    return Array.from({ length: Math.ceil(lines.length / slideSize) }, (_, index) => {
      const start = index * slideSize
      const content = lines.slice(start, start + slideSize).join('\n')
      return {
        id: `${section.id}-${index}`,
        label: section.label,
        part: index + 1,
        content,
      }
    })
  })
}

export default function SongsPage({
  onProject,
  songDisplaySettings,
  onSongDisplaySettingsChange,
  songSettingsError,
}) {
  const [songs, setSongs] = useState(starterSongs)
  const [isLoadingSongs, setIsLoadingSongs] = useState(true)
  const [storageError, setStorageError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSong, setEditingSong] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [activeSongId, setActiveSongId] = useState(null)
  const [projectedSlideId, setProjectedSlideId] = useState(null)

  const activeSong = songs.find((song) => song.id === activeSongId)
  const slideSections = activeSong ? parseSongSections(activeSong.lyrics) : []
  const projectionSlides = createProjectionSlides(slideSections, songDisplaySettings.linesPerSlide)
  const filteredSongs = songs.filter((song) =>
    `${song.title} ${song.artist}`.toLowerCase().includes(searchTerm.trim().toLowerCase()),
  )

  useEffect(() => {
    let cancelled = false

    async function loadSongs() {
      try {
        const loadedSongs = window.churchCast?.songs
          ? await window.churchCast.songs.list()
          : readSavedSongs()
        if (!Array.isArray(loadedSongs)) {
          throw new Error('The song database returned an invalid song library.')
        }
        if (!cancelled) {
          setSongs(loadedSongs)
          setStorageError('')
        }
      } catch (error) {
        console.error('Unable to load the song library.', error)
        if (!cancelled) {
          setStorageError(error.message || 'Unable to load the song library.')
        }
      } finally {
        if (!cancelled) setIsLoadingSongs(false)
      }
    }

    void loadSongs()
    return () => {
      cancelled = true
    }
  }, [])

  function persistSongList(nextSongs) {
    if (!window.churchCast?.songs) {
      window.localStorage.setItem(SAVED_SONGS_KEY, JSON.stringify(nextSongs))
    }
  }

  async function handleAddSong(song) {
    const newSong = {
      ...song,
      id: song.id || globalThis.crypto?.randomUUID?.() || `song-${Date.now()}`,
    }
    const nextSongs = [newSong, ...songs]
    if (window.churchCast?.songs) await window.churchCast.songs.save(newSong)
    else await persistSongList(nextSongs)
    setSongs(nextSongs)
  }

  async function handleUpdateSong(updatedSong) {
    const nextSongs = songs.map((song) => (song.id === updatedSong.id ? updatedSong : song))
    if (window.churchCast?.songs) await window.churchCast.songs.save(updatedSong)
    else await persistSongList(nextSongs)
    setSongs(nextSongs)
  }

  async function handleDeleteSong(songId) {
    const nextSongs = songs.filter((song) => song.id !== songId)
    if (window.churchCast?.songs) await window.churchCast.songs.delete(songId)
    else await persistSongList(nextSongs)
    setSongs(nextSongs)
    setActiveSongId((currentId) => (currentId === songId ? null : currentId))
  }

  function projectSlideToAudience(content, slideId) {
    if (!content.trim()) return

    setProjectedSlideId(slideId)
    onProject(content)
  }

  function openEditor(song = null) {
    setEditingSong(song)
    setStorageError('')
    setIsModalOpen(true)
    setOpenMenuId(null)
  }

  function closeEditor() {
    setIsModalOpen(false)
    setEditingSong(null)
  }

  async function handleSaveSong(song) {
    try {
      if (editingSong) {
        await handleUpdateSong({ ...editingSong, ...song })
      } else {
        await handleAddSong(song)
      }
      setStorageError('')
      closeEditor()
    } catch (error) {
      console.error('Unable to save the song.', error)
      setStorageError(error.message || 'Unable to save the song.')
    }
  }

  async function handleDeleteSongSafely(songId) {
    try {
      await handleDeleteSong(songId)
      setStorageError('')
    } catch (error) {
      console.error('Unable to delete the song.', error)
      setStorageError(error.message || 'Unable to delete the song.')
      setOpenMenuId(null)
    }
  }

  return (
    <main className="relative min-h-screen bg-[#1a1a1a] p-6 text-zinc-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Presenter library
            </p>
            <h1 className="mt-2 text-2xl font-semibold">Lyrics &amp; Songs Library</h1>
            <p className="mt-1 text-sm text-zinc-400">Manage songs for your services.</p>
          </div>
          <span className="text-xs text-zinc-500">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          </span>
        </div>

        {storageError && (
          <p role="alert" className="mb-4 rounded-md border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
            {storageError}
          </p>
        )}
        {songSettingsError && (
          <p role="alert" className="mb-4 rounded-md border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
            {songSettingsError}
          </p>
        )}
        {isLoadingSongs && (
          <p role="status" className="mb-4 text-xs text-zinc-500">
            Loading saved songs...
          </p>
        )}

        <label className="relative mb-5 block max-w-lg">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search songs or artists"
            aria-label="Search songs or artists"
            className="h-10 w-full rounded-md border border-zinc-800 bg-zinc-900 pl-10 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
          />
        </label>

        <section
          aria-labelledby="song-display-style-title"
          className="mb-5 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
        >
          <div className="mb-3">
            <h2 id="song-display-style-title" className="text-sm font-semibold text-zinc-100">
              Global audience song style
            </h2>
            <p className="mt-1 text-[11px] text-zinc-500">
              These settings apply to every song projected on the audience display.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="min-w-0 text-[11px] text-zinc-400">
              Font
              <select
                value={songDisplaySettings.fontFamily}
                onChange={(event) =>
                  onSongDisplaySettingsChange({ fontFamily: event.target.value })
                }
                aria-label="Audience song font"
                className="mt-1 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Courier New', monospace">Courier New</option>
              </select>
            </label>
            <label className="text-[11px] text-zinc-400">
              Font size · {songDisplaySettings.fontSize}px
              <input
                type="range"
                min="24"
                max="96"
                step="2"
                value={songDisplaySettings.fontSize}
                onChange={(event) =>
                  onSongDisplaySettingsChange({ fontSize: Number(event.target.value) })
                }
                aria-label="Audience song font size"
                className="mt-3 block h-3 w-full cursor-pointer accent-sky-500"
              />
            </label>
            <label className="text-[11px] text-zinc-400">
              Font color
              <span className="mt-1 flex h-9 items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-2">
                <input
                  type="color"
                  value={songDisplaySettings.fontColor}
                  onChange={(event) =>
                    onSongDisplaySettingsChange({ fontColor: event.target.value })
                  }
                  aria-label="Audience song font color"
                  className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="font-mono text-xs text-zinc-300">
                  {songDisplaySettings.fontColor.toUpperCase()}
                </span>
              </span>
            </label>
          </div>
        </section>

        {activeSong ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setActiveSongId(null)}
                className="inline-flex h-8 items-center gap-2 rounded-md px-2 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Song library
              </button>
              <p className="text-[11px] text-zinc-500">
                {projectedSlideId?.startsWith(`${activeSong.id}-`)
                  ? 'A slide from this song is on the audience display'
                  : 'Select a slide to project it'}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(14rem,0.75fr)_minmax(0,1.25fr)]">
              <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Song details
                </p>
                <h2 className="mt-2 text-lg font-semibold text-zinc-100">{activeSong.title}</h2>
                <p className="mt-1 text-sm text-zinc-400">{activeSong.artist}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-800 pt-3 text-xs">
                  <div>
                    <dt className="text-zinc-500">Composer</dt>
                    <dd className="mt-1 text-zinc-300">{activeSong.composer || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Key</dt>
                    <dd className="mt-1 text-zinc-300">{activeSong.key || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Tempo</dt>
                    <dd className="mt-1 text-zinc-300">{activeSong.tempo || 'Not set'}</dd>
                  </div>
                </dl>
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <h3 className="text-xs font-medium text-zinc-300">Song text</h3>
                  <pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-zinc-500">
                    {activeSong.lyrics || 'No lyrics added yet. Edit this song to add lyrics and sections.'}
                  </pre>
                </div>
              </section>

              <section aria-label="Song slides">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">Projection slides</h2>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {projectionSlides.length} {projectionSlides.length === 1 ? 'slide' : 'slides'}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-[11px] text-zinc-400">
                    Lyrics per slide
                    <select
                      value={songDisplaySettings.linesPerSlide}
                      onChange={(event) => {
                        onSongDisplaySettingsChange({ linesPerSlide: event.target.value })
                        setProjectedSlideId(null)
                      }}
                      aria-label="Lyrics per projection slide"
                      className="h-8 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      <option value="all">Full section</option>
                      <option value="2">2 lines</option>
                      <option value="3">3 lines</option>
                      <option value="4">4 lines</option>
                    </select>
                  </label>
                </div>
                {projectionSlides.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {projectionSlides.map((slide, index) => {
                      const slideId = `${activeSong.id}-${slide.id}`
                      const isProjected = projectedSlideId === slideId

                      return (
                        <button
                          key={slideId}
                          type="button"
                          aria-pressed={isProjected}
                          aria-label={`Project ${slide.label}, slide ${slide.part}`}
                          onClick={() => projectSlideToAudience(slide.content, slideId)}
                          className={`min-h-32 w-full cursor-pointer rounded border p-4 text-left transition ${
                            isProjected
                              ? 'border-2 border-blue-500 bg-blue-950/40'
                              : 'border-zinc-700 bg-zinc-800 hover:bg-blue-900'
                          }`}
                        >
                          <span className="block text-xs font-semibold text-zinc-100">
                            {slide.label}
                            {songDisplaySettings.linesPerSlide !== 'all' && ` · Slide ${index + 1}`}
                          </span>
                          <span className="mt-2 block line-clamp-5 whitespace-pre-line text-xs leading-5 text-zinc-400">
                            {slide.content}
                          </span>
                          {isProjected && (
                            <span className="mt-3 block text-[10px] font-medium uppercase tracking-wide text-blue-300">
                              Projected
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-zinc-800 px-5 py-10 text-center">
                    <p className="text-xs font-medium text-zinc-300">No sections to project</p>
                    <p className="mt-1 text-[11px] text-zinc-500">
                      Edit the song and add labels such as [Verse 1] or [Chorus].
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : filteredSongs.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSongs.map((song) => (
              <li
                key={song.id}
                className="relative flex min-h-24 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
              >
                <button
                  type="button"
                  onClick={() => setActiveSongId(song.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-800 text-zinc-300">
                    <Music2 size={19} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-100">{song.title}</span>
                    <span className="mt-1 block truncate text-xs text-zinc-500">{song.artist}</span>
                  </span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    aria-label={`Actions for ${song.title}`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuId === song.id}
                    onClick={() =>
                      setOpenMenuId((currentId) => (currentId === song.id ? null : song.id))
                    }
                    className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                  >
                    <EllipsisVertical size={17} aria-hidden="true" />
                  </button>
                  {openMenuId === song.id && (
                    <div
                      role="menu"
                      aria-label={`${song.title} actions`}
                      className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl shadow-black/30"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => openEditor(song)}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      >
                        <Pencil size={13} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          void handleDeleteSongSafely(song.id)
                          setOpenMenuId(null)
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-red-300 hover:bg-zinc-800"
                      >
                        <Trash2 size={13} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 px-6 py-14 text-center">
            <Music2 size={22} className="mx-auto text-zinc-600" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-zinc-300">
              {songs.length ? 'No matching songs' : 'Your song library is empty'}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {songs.length ? 'Try another title or artist.' : 'Add a song to get started.'}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Add song"
        title="Add song"
        onClick={() => openEditor()}
        disabled={isLoadingSongs}
        className="fixed bottom-6 right-[22rem] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus size={27} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {isModalOpen && (
        <SongEditorModal
          isOpen={isModalOpen}
          song={editingSong}
          onClose={closeEditor}
          onSave={handleSaveSong}
          errorMessage={storageError}
        />
      )}
    </main>
  )
}