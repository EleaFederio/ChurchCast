import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, Plus, Presentation, Search, Trash2 } from 'lucide-react'

const SAVED_BIBLES_KEY = 'churchcast.savedBibles'

function readSavedBibles() {
  try {
    const savedBibles = JSON.parse(window.localStorage.getItem(SAVED_BIBLES_KEY) || '[]')
    return Array.isArray(savedBibles)
      ? savedBibles.filter(
          (bible) => bible && (typeof bible.id === 'number' || typeof bible.id === 'string'),
        )
      : []
  } catch (error) {
    console.error('Unable to read the saved Bible library.', error)
    return []
  }
}

function getYouVersionApi() {
  if (!window.churchCast?.youversion) {
    throw new Error('YouVersion Bible access is available in the Church Cast desktop app.')
  }
  return window.churchCast.youversion
}

function formatReference(book, chapter, verse) {
  return `${book?.abbreviation || book?.title || book?.id} ${chapter?.title}:${verse?.title}`
}

export default function ScripturePage({ onProject }) {
  const [savedBibles, setSavedBibles] = useState(readSavedBibles)
  const [selectedBibleId, setSelectedBibleId] = useState('')
  const [catalog, setCatalog] = useState([])
  const [catalogSearch, setCatalogSearch] = useState('')
  const [languageRange, setLanguageRange] = useState('en')
  const [nextPageToken, setNextPageToken] = useState('')
  const [isCatalogLoading, setIsCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [storageError, setStorageError] = useState('')
  const [indexState, setIndexState] = useState(null)
  const [bookId, setBookId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [verseId, setVerseId] = useState('')
  const [endVerseId, setEndVerseId] = useState('')
  const [versesPerSlide, setVersesPerSlide] = useState('1')
  const [passages, setPassages] = useState([])
  const [activeSlideIndex, setActiveSlideIndex] = useState(0)
  const [isPassageLoading, setIsPassageLoading] = useState(false)
  const [passageError, setPassageError] = useState('')
  const passageRequestId = useRef(0)

  const selectedBible =
    savedBibles.find((bible) => String(bible.id) === selectedBibleId) || savedBibles[0]
  const indexMatchesBible = String(indexState?.bibleId) === String(selectedBible?.id)
  const books = indexMatchesBible ? indexState?.books || [] : []
  const isIndexLoading = Boolean(selectedBible && (!indexMatchesBible || indexState?.loading))
  const indexError = indexMatchesBible ? indexState?.error || '' : ''
  const selectedBook = books.find((book) => book.id === bookId) || books[0]
  const chapters = selectedBook?.chapters || []
  const selectedChapter =
    chapters.find((chapter) => String(chapter.id) === chapterId) || chapters[0]
  const verses = selectedChapter?.verses || []
  const selectedVerse = verses.find((verse) => String(verse.id) === verseId) || verses[0]
  const selectedEndVerse =
    verses.find((verse) => String(verse.id) === endVerseId) || selectedVerse
  const startVerseIndex = verses.findIndex((verse) => verse.id === selectedVerse?.id)
  const endVerseIndex = verses.findIndex((verse) => verse.id === selectedEndVerse?.id)
  const selectedVerses =
    startVerseIndex >= 0 && endVerseIndex >= startVerseIndex
      ? verses.slice(startVerseIndex, endVerseIndex + 1)
      : []
  const verseSlides = useMemo(() => {
    const slideSize = Number(versesPerSlide)
    const slides = []
    for (let index = 0; index < passages.length; index += slideSize) {
      slides.push(passages.slice(index, index + slideSize))
    }
    return slides
  }, [passages, versesPerSlide])
  const activeSlide = verseSlides[activeSlideIndex] || []

  const filteredCatalog = useMemo(() => {
    const searchTerm = catalogSearch.trim().toLowerCase()
    if (!searchTerm) return catalog
    return catalog.filter((bible) =>
      [
        bible.title,
        bible.localized_title,
        bible.abbreviation,
        bible.localized_abbreviation,
        bible.publisher_name,
        bible.language_tag,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchTerm),
    )
  }, [catalog, catalogSearch])

  const loadCatalog = useCallback(
    async (pageToken = '', append = false) => {
      setIsCatalogLoading(true)
      setCatalogError('')
      try {
        const result = await getYouVersionApi().listBibles({
          languageRange,
          pageToken,
        })
        if (!Array.isArray(result?.data)) {
          throw new Error('YouVersion returned an unexpected Bible catalog response.')
        }
        setCatalog((currentCatalog) =>
          append ? [...currentCatalog, ...result.data] : result.data,
        )
        setNextPageToken(result.next_page_token || '')
      } catch (error) {
        setCatalogError(error.message || 'Unable to load Bible versions.')
      } finally {
        setIsCatalogLoading(false)
      }
    },
    [languageRange],
  )

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadCatalog()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadCatalog])

  useEffect(() => {
    if (!selectedBible) {
      return undefined
    }

    let cancelled = false
    const bibleId = String(selectedBible.id)
    const timerId = window.setTimeout(() => {
      setIndexState({ bibleId, loading: true, books: null, error: '' })
      getYouVersionApi()
        .getIndex(selectedBible.id)
        .then((result) => {
          if (!Array.isArray(result?.books)) {
            throw new Error('YouVersion returned an unexpected Bible index response.')
          }
          if (!cancelled) {
            setIndexState({ bibleId, loading: false, books: result.books, error: '' })
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setIndexState({
              bibleId,
              loading: false,
              books: null,
              error: error.message || 'Unable to load this Bible’s book list.',
            })
          }
        })
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [selectedBible])

  function saveBibleList(nextBibles) {
    try {
      window.localStorage.setItem(SAVED_BIBLES_KEY, JSON.stringify(nextBibles))
      setStorageError('')
    } catch (error) {
      console.error('Unable to save the Bible library.', error)
      setStorageError('The Bible library could not be saved on this device.')
    }
    setSavedBibles(nextBibles)
  }

  function addBible(bible) {
    if (savedBibles.some((savedBible) => String(savedBible.id) === String(bible.id))) return
    saveBibleList([...savedBibles, bible])
    setSelectedBibleId(String(bible.id))
  }

  function removeBible(bibleIdToRemove) {
    clearLoadedPassages()
    saveBibleList(
      savedBibles.filter((bible) => String(bible.id) !== String(bibleIdToRemove)),
    )
  }

  function clearLoadedPassages() {
    passageRequestId.current += 1
    setPassages([])
    setActiveSlideIndex(0)
    setPassageError('')
  }

  async function loadPassage() {
    if (!selectedBible || !selectedBook || !selectedChapter || selectedVerses.length === 0) return

    setPassages([])
    setActiveSlideIndex(0)
    setPassageError('')
    setIsPassageLoading(true)
    const requestId = ++passageRequestId.current

    try {
      const api = getYouVersionApi()
      const loadedPassages = []
      for (let index = 0; index < selectedVerses.length; index += 4) {
        const verseBatch = selectedVerses.slice(index, index + 4)
        const batchResults = await Promise.all(
          verseBatch.map(async (verse) => {
            const result = await api.getPassage({
              bibleId: selectedBible.id,
              passageId: `${selectedBook.id}.${selectedChapter.id}.${verse.id}`,
            })
            if (typeof result?.content !== 'string' || !result.content.trim()) {
              throw new Error(`YouVersion returned no text for verse ${verse.title}.`)
            }
            return {
              reference:
                result.reference ||
                formatReference(selectedBook, selectedChapter, verse),
              content: result.content,
            }
          }),
        )
        loadedPassages.push(...batchResults)
      }
      if (requestId === passageRequestId.current) {
        setPassages(loadedPassages)
      }
    } catch (error) {
      if (requestId === passageRequestId.current) {
        setPassageError(error.message || 'Unable to load these verses.')
      }
    } finally {
      if (requestId === passageRequestId.current) setIsPassageLoading(false)
    }
  }

  function projectSlide(slideIndex) {
    const slide = verseSlides[slideIndex]
    if (!slide?.length) return
    setActiveSlideIndex(slideIndex)
    const reference = `${slide[0].reference}–${slide[slide.length - 1].reference}`
    const slideText = slide
      .map((passage) => `${passage.reference}\n${passage.content}`)
      .join('\n\n')
    onProject(`${reference} (${selectedBible.abbreviation || selectedBible.title})\n\n${slideText}`)
  }

  const savedBibleIds = new Set(savedBibles.map((bible) => String(bible.id)))

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-2 text-zinc-100">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            YouVersion Platform
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Scripture</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Add available Bible versions, select a verse, and project it to the audience.
          </p>
        </div>
        <span className="text-xs text-zinc-500">
          {savedBibles.length} {savedBibles.length === 1 ? 'Bible' : 'Bibles'} in your library
        </span>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div className="space-y-5">
          <section aria-labelledby="bible-library-title" className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="bible-library-title" className="text-sm font-semibold">Your Bibles</h2>
                <p className="mt-1 text-xs text-zinc-500">
                  Versions are saved on this device; scripture text is fetched online.
                </p>
              </div>
              <BookOpen size={18} className="text-zinc-500" aria-hidden="true" />
            </div>

            {storageError && (
              <p role="alert" className="mb-3 text-xs text-red-300">{storageError}</p>
            )}

            {savedBibles.length > 0 ? (
              <ul className="space-y-2">
                {savedBibles.map((bible) => {
                  const isSelected = String(bible.id) === String(selectedBible?.id)
                  return (
                    <li
                      key={bible.id}
                      className={`flex items-center gap-2 rounded-md border p-2 ${
                        isSelected
                          ? 'border-sky-800 bg-sky-950/40'
                          : 'border-zinc-800 bg-zinc-950/40'
                      }`}
                    >
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => {
                          setSelectedBibleId(String(bible.id))
                          clearLoadedPassages()
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-xs font-medium text-zinc-100">
                          {bible.localized_title || bible.title}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-zinc-500">
                          {[bible.localized_abbreviation || bible.abbreviation, bible.publisher_name, bible.language_tag]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${bible.title} from your Bibles`}
                        title="Remove from your Bibles"
                        onClick={() => removeBible(bible.id)}
                        className="grid size-8 shrink-0 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-red-300"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-500">
                No Bibles added yet. Find a version below.
              </p>
            )}
          </section>

          <section aria-labelledby="passage-title" className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-4">
              <h2 id="passage-title" className="text-sm font-semibold">Choose a passage</h2>
              <p className="mt-1 text-xs text-zinc-500">Select a Bible, book, chapter, and verse.</p>
            </div>

            {savedBibles.length > 0 && (
              <label className="mb-3 block text-xs text-zinc-400">
                Bible version
                <select
                  value={selectedBible ? String(selectedBible.id) : ''}
                  onChange={(event) => {
                    setSelectedBibleId(event.target.value)
                    clearLoadedPassages()
                  }}
                  className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2.5 text-xs text-zinc-100 outline-none focus:border-sky-600"
                >
                  {savedBibles.map((bible) => (
                    <option key={bible.id} value={bible.id}>
                      {bible.localized_title || bible.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isIndexLoading && <p className="text-xs text-zinc-500">Loading books…</p>}
            {indexError && <p role="alert" className="text-xs text-red-300">{indexError}</p>}

            {books.length > 0 && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-zinc-400">
                    Book
                    <select
                      value={selectedBook?.id || ''}
                      onChange={(event) => {
                        setBookId(event.target.value)
                        setChapterId('')
                        setVerseId('')
                        setEndVerseId('')
                        clearLoadedPassages()
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      {books.map((book) => (
                        <option key={book.id} value={book.id}>{book.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Chapter
                    <select
                      value={selectedChapter?.id || ''}
                      onChange={(event) => {
                        setChapterId(event.target.value)
                        setVerseId('')
                        setEndVerseId('')
                        clearLoadedPassages()
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>{chapter.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Start verse
                    <select
                      value={selectedVerse?.id || ''}
                      onChange={(event) => {
                        setVerseId(event.target.value)
                        const nextStartIndex = verses.findIndex(
                          (verse) => String(verse.id) === event.target.value,
                        )
                        const currentEndIndex = verses.findIndex(
                          (verse) => String(verse.id) === endVerseId,
                        )
                        if (currentEndIndex < nextStartIndex) setEndVerseId(event.target.value)
                        clearLoadedPassages()
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      {verses.map((verse) => (
                        <option key={verse.id} value={verse.id}>{verse.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    End verse
                    <select
                      value={selectedEndVerse?.id || ''}
                      onChange={(event) => {
                        setEndVerseId(event.target.value)
                        clearLoadedPassages()
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      {verses.slice(Math.max(startVerseIndex, 0)).map((verse) => (
                        <option key={verse.id} value={verse.id}>{verse.title}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-zinc-400">
                    Verses per slide
                    <select
                      value={versesPerSlide}
                      onChange={(event) => {
                        setVersesPerSlide(event.target.value)
                        setActiveSlideIndex(0)
                      }}
                      className="mt-1.5 h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-600"
                    >
                      <option value="1">1 verse</option>
                      <option value="2">2 verses</option>
                      <option value="3">3 verses</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={!selectedVerses.length || isPassageLoading}
                  onClick={loadPassage}
                  className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-zinc-100 px-3 text-xs font-medium text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPassageLoading
                    ? 'Loading verses…'
                    : `Load ${selectedVerses.length === 1 ? 'verse' : `${selectedVerses.length} verses`}`}
                </button>
              </>
            )}

            {!selectedBible && (
              <p className="rounded-md border border-dashed border-zinc-800 px-3 py-5 text-center text-xs text-zinc-500">
                Add a Bible version to browse its books and passages.
              </p>
            )}
            {passageError && <p role="alert" className="mt-3 text-xs text-red-300">{passageError}</p>}
          </section>

          {passages.length > 0 && (
            <section aria-label="Selected scripture passage" className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-zinc-100">
                    {passages[0].reference}–{passages[passages.length - 1].reference}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {selectedBible.localized_title || selectedBible.title} · {verseSlides.length} audience {verseSlides.length === 1 ? 'slide' : 'slides'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={activeSlideIndex === 0}
                    onClick={() => projectSlide(activeSlideIndex - 1)}
                    className="h-9 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={activeSlideIndex >= verseSlides.length - 1}
                    onClick={() => projectSlide(activeSlideIndex + 1)}
                    className="h-9 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    onClick={() => projectSlide(activeSlideIndex)}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-sky-600 px-3 text-xs font-medium text-white hover:bg-sky-500"
                  >
                    <Presentation size={14} aria-hidden="true" />
                    Send to audience
                  </button>
                </div>
              </div>
              <p className="mt-3 text-right text-[11px] text-zinc-500">
                Slide {activeSlideIndex + 1} of {verseSlides.length} · {activeSlide.length} {activeSlide.length === 1 ? 'verse' : 'verses'}
              </p>
              <div className="mt-2 space-y-3">
                {activeSlide.map((passage) => (
                  <p key={passage.reference} className="whitespace-pre-line text-sm leading-6 text-zinc-200">
                    <span className="mr-2 text-xs font-semibold text-sky-300">{passage.reference}</span>
                    {passage.content}
                  </p>
                ))}
              </div>
              {selectedBible.copyright && (
                <p className="mt-4 border-t border-zinc-800 pt-3 text-[10px] leading-4 text-zinc-500">
                  {selectedBible.copyright}
                </p>
              )}
            </section>
          )}
        </div>

        <section aria-labelledby="browse-bibles-title" className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-4">
            <h2 id="browse-bibles-title" className="text-sm font-semibold">Browse Bible versions</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Only versions available to this YouVersion app key are listed.
            </p>
          </div>

          <form
            className="mb-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              setCatalog([])
              setNextPageToken('')
              void loadCatalog()
            }}
          >
            <label className="relative min-w-0 flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                type="search"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Search versions"
                aria-label="Search Bible versions"
                className="h-9 w-full rounded-md border border-zinc-700 bg-zinc-950 pl-8 pr-2 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-700"
              />
            </label>
            <label className="sr-only" htmlFor="bible-language-range">Language code</label>
            <input
              id="bible-language-range"
              value={languageRange}
              onChange={(event) => setLanguageRange(event.target.value)}
              aria-label="Language code"
              title="Language range, such as en or es"
              className="h-9 w-16 rounded-md border border-zinc-700 bg-zinc-950 px-2 text-xs text-zinc-100 outline-none focus:border-sky-700"
            />
            <button
              type="submit"
              disabled={isCatalogLoading || !languageRange.trim()}
              className="h-9 rounded-md border border-zinc-700 px-3 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Search
            </button>
          </form>

          {catalogError && (
            <p role="alert" className="mb-3 rounded-md border border-red-900/60 bg-red-950/30 p-2.5 text-xs text-red-300">
              {catalogError}
            </p>
          )}

          {isCatalogLoading && catalog.length === 0 ? (
            <p className="py-6 text-center text-xs text-zinc-500">Loading Bible versions…</p>
          ) : filteredCatalog.length > 0 ? (
            <ul className="max-h-[34rem] space-y-2 overflow-y-auto pr-1">
              {filteredCatalog.map((bible) => {
                const isSaved = savedBibleIds.has(String(bible.id))
                return (
                  <li key={bible.id} className="flex items-center gap-2 rounded-md border border-zinc-800 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-100">
                        {bible.localized_title || bible.title}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-zinc-500">
                        {[bible.localized_abbreviation || bible.abbreviation, bible.publisher_name]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSaved}
                      onClick={() => addBible(bible)}
                      aria-label={isSaved ? `${bible.title} added` : `Add ${bible.title} to your Bibles`}
                      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-zinc-700 px-2 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:cursor-default disabled:opacity-50"
                    >
                      <Plus size={13} aria-hidden="true" />
                      {isSaved ? 'Added' : 'Add'}
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-xs text-zinc-500">
              {catalog.length ? 'No matching Bible versions.' : 'No Bible versions found.'}
            </p>
          )}

          {nextPageToken && (
            <button
              type="button"
              disabled={isCatalogLoading}
              onClick={() => void loadCatalog(nextPageToken, true)}
              className="mt-3 h-9 w-full rounded-md border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              {isCatalogLoading ? 'Loading…' : 'Load more versions'}
            </button>
          )}
        </section>
      </section>
    </main>
  )
}
