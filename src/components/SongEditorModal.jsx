import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronRight,
  ExternalLink,
  LoaderCircle,
  Music2,
  Search,
  X,
} from 'lucide-react'

const mockUltimateGuitarResponse = {
  data: {
    tabs: [
      {
        id: 'ug-100',
        name: 'Amazing Grace',
        artist_name: 'Traditional',
        composer: 'John Newton',
        type: 'Chords',
        rating: 4.9,
        votes: 512,
        tonality_name: 'G',
        bpm: 72,
        tab_url: 'https://tabs.ultimate-guitar.com/',
      },
      {
        id: 'ug-101',
        name: 'Grace Like Rain',
        artist_name: 'The Harbor Collective',
        composer: 'The Harbor Collective',
        type: 'Chords',
        rating: 4.8,
        votes: 126,
        tonality_name: 'G',
        bpm: 72,
        tab_url: 'https://tabs.ultimate-guitar.com/',
      },
      {
        id: 'ug-102',
        name: 'Morning Light',
        artist_name: 'Northbound',
        composer: 'Northbound',
        type: 'Chords',
        rating: 4.5,
        votes: 84,
        tonality_name: 'D',
        bpm: 96,
        tab_url: 'https://tabs.ultimate-guitar.com/',
      },
      {
        id: 'ug-103',
        name: 'Come to the Table',
        artist_name: 'Common Hymnal',
        composer: 'Common Hymnal',
        type: 'Chords',
        rating: 4.7,
        votes: 103,
        tonality_name: 'C',
        bpm: 68,
        tab_url: 'https://tabs.ultimate-guitar.com/',
      },
    ],
  },
}

async function fetchMockUltimateGuitarResults(query) {
  await new Promise((resolve) => window.setTimeout(resolve, 250))
  const searchTerms = query.trim().toLowerCase().split(/\s+/)

  return mockUltimateGuitarResponse.data.tabs.filter((result) => {
    const searchableText = `${result.name} ${result.artist_name}`.toLowerCase()
    return searchTerms.every((term) => searchableText.includes(term))
  })
}

const sectionTags = ['Verse 1', 'Verse 2', 'Chorus', 'Bridge']

export default function SongEditorModal({
  isOpen,
  onClose,
  onSave,
  song = null,
  errorMessage = '',
}) {
  const [mode, setMode] = useState('manual')
  const [title, setTitle] = useState(song?.title ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [composer, setComposer] = useState(song?.composer ?? '')
  const [lyrics, setLyrics] = useState(song?.lyrics ?? '')
  const [songKey, setSongKey] = useState(song?.key ?? '')
  const [tempo, setTempo] = useState(song?.tempo ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [selectedResult, setSelectedResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState('')
  const lyricsRef = useRef(null)
  const ultimateGuitarSearchUrl = `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(searchQuery.trim())}`

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  async function handleSearch(event) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setIsSearching(true)
    setSearchMessage('')
    setResults([])
    setSelectedResult(null)

    const searchResults = await fetchMockUltimateGuitarResults(query)
    setResults(searchResults)
    setSearchMessage(searchResults.length ? '' : 'No matching songs found. Try another search.')
    setIsSearching(false)
  }

  function selectResult(result) {
    setSelectedResult(result)
    setTitle(result.name)
    setArtist(result.artist_name)
    setComposer(result.composer)
    setSongKey(result.tonality_name)
    setTempo(`${result.bpm} BPM`)
    setLyrics('')
  }

  function addSection(section) {
    const textarea = lyricsRef.current
    const selectionStart = textarea?.selectionStart ?? lyrics.length
    const selectionEnd = textarea?.selectionEnd ?? lyrics.length
    const prefix = selectionStart > 0 && lyrics[selectionStart - 1] !== '\n' ? '\n' : ''
    const insertion = `${prefix}[${section}]\n`
    const updatedLyrics =
      lyrics.slice(0, selectionStart) + insertion + lyrics.slice(selectionEnd)
    const cursorPosition = selectionStart + insertion.length

    setLyrics(updatedLyrics)
    window.requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus()
      textarea.setSelectionRange(cursorPosition, cursorPosition)
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!title.trim() || !artist.trim()) return

    onSave({
      ...song,
      title: title.trim(),
      artist: artist.trim(),
      composer: composer.trim(),
      lyrics,
      key: songKey.trim(),
      tempo: tempo.trim(),
      source: selectedResult ? 'ultimate-guitar' : 'manual',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-editor-title"
        className="flex max-h-[min(90vh,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-100 shadow-2xl shadow-black/50"
      >
        <header className="mb-5 flex shrink-0 items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-blue-400">
              Song library
            </p>
            <h2 id="song-editor-title" className="mt-1 text-lg font-semibold">
              {song ? 'Edit song' : 'Create a song'}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close song editor"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
          >
            <X size={17} aria-hidden="true" />
          </button>
        </header>

        {errorMessage && (
          <p role="alert" className="mb-4 rounded-md border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
            {errorMessage}
          </p>
        )}

        <div className="mb-5 grid shrink-0 grid-cols-2 rounded-lg border border-zinc-800 bg-zinc-950/70 p-1">
          <button
            type="button"
            aria-pressed={mode === 'manual'}
            onClick={() => setMode('manual')}
            className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              mode === 'manual'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Manual Entry
          </button>
          <button
            type="button"
            aria-pressed={mode === 'ultimate-guitar'}
            onClick={() => setMode('ultimate-guitar')}
            className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              mode === 'ultimate-guitar'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Search Ultimate Guitar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {mode === 'ultimate-guitar' ? (
              <div className="space-y-4">
                <section aria-label="Ultimate Guitar search">
                  <label htmlFor="ultimate-guitar-search" className="mb-2 block text-xs font-medium text-zinc-300">
                    Search songs
                  </label>
                  <div className="flex gap-2">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        size={15}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                        aria-hidden="true"
                      />
                      <input
                        id="ultimate-guitar-search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Title or artist"
                        className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 pl-9 pr-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!searchQuery.trim() || isSearching}
                      onClick={handleSearch}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSearching ? (
                        <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <Search size={15} aria-hidden="true" />
                      )}
                      Search
                    </button>
                  </div>
                </section>

                <section aria-label="Search results" className="overflow-hidden rounded-lg border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
                    <h3 className="text-xs font-medium text-zinc-300">Search results</h3>
                    <span className="text-[10px] text-zinc-500">Mock Ultimate Guitar API</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto p-1">
                    {results.length ? (
                      results.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          aria-pressed={selectedResult?.id === result.id}
                          onClick={() => selectResult(result)}
                          className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                            selectedResult?.id === result.id
                              ? 'bg-blue-500/10 text-blue-100'
                              : 'text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <Music2 size={16} className="shrink-0 text-zinc-500" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{result.name}</span>
                            <span className="mt-0.5 block truncate text-[11px] text-zinc-500">
                              {result.artist_name} · {result.type}
                            </span>
                          </span>
                          {selectedResult?.id === result.id ? (
                            <Check size={15} className="text-blue-400" aria-hidden="true" />
                          ) : (
                            <ChevronRight size={15} className="text-zinc-600" aria-hidden="true" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-5 text-center">
                        <p className="text-xs text-zinc-500">
                          {searchMessage || 'Search to browse matching songs.'}
                        </p>
                        {searchMessage && (
                          <a
                            href={ultimateGuitarSearchUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800"
                          >
                            Search on Ultimate Guitar
                            <ExternalLink size={13} aria-hidden="true" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {selectedResult && (
                  <section
                    aria-label="Selected song preview"
                    className="rounded-lg border border-blue-900/70 bg-blue-950/30 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">
                          Selected song preview
                        </p>
                        <h3 className="mt-1 truncate text-sm font-semibold">{selectedResult.name}</h3>
                        <p className="mt-0.5 truncate text-xs text-zinc-400">
                          {selectedResult.artist_name} · {selectedResult.type}
                        </p>
                      </div>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-500/10 text-blue-300">
                        <Check size={16} aria-hidden="true" />
                      </span>
                    </div>
                    <dl className="mt-3 flex gap-5 text-[11px]">
                      <div>
                        <dt className="text-zinc-500">Key</dt>
                        <dd className="mt-0.5 text-zinc-200">{selectedResult.tonality_name}</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Tempo</dt>
                        <dd className="mt-0.5 text-zinc-200">{selectedResult.bpm} BPM</dd>
                      </div>
                      <div>
                        <dt className="text-zinc-500">Rating</dt>
                        <dd className="mt-0.5 text-zinc-200">{selectedResult.rating} / 5</dd>
                      </div>
                    </dl>
                  </section>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1.5 text-xs font-medium text-zinc-300 sm:col-span-2">
                    Song Title <span className="text-blue-400">*</span>
                    <input
                      autoFocus
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Enter song title"
                      required
                      className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-zinc-300">
                    Artist <span className="text-blue-400">*</span>
                    <input
                      value={artist}
                      onChange={(event) => setArtist(event.target.value)}
                      placeholder="Artist or band"
                      required
                      className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                    />
                  </label>
                  <label className="block space-y-1.5 text-xs font-medium text-zinc-300">
                    Composer
                    <input
                      value={composer}
                      onChange={(event) => setComposer(event.target.value)}
                      placeholder="Songwriter or composer"
                      className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                    />
                  </label>
                </div>

                <section aria-label="Lyrics and chord editor">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-medium text-zinc-300">Lyrics &amp; chords</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {sectionTags.map((section) => (
                        <button
                          key={section}
                          type="button"
                          onClick={() => addSection(section)}
                          className="rounded border border-zinc-700 bg-zinc-800/70 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                        >
                          + {section}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={lyricsRef}
                    value={lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    placeholder={'[Verse 1]\nG                 D\nWrite lyrics and chords here...'}
                    aria-label="Lyrics and chords"
                    className="h-64 w-full resize-y rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-sm text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-blue-500"
                  />
                  <p className="mt-1.5 text-[10px] text-zinc-500">
                    Add section labels, then place chord names above each lyric line.
                  </p>
                </section>
              </div>
            )}
          </div>

          <footer className="mt-5 flex shrink-0 justify-end gap-2 border-t border-zinc-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md px-3 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !artist.trim()}
              className="h-9 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save Song
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}