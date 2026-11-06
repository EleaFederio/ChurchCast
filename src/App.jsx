import { useEffect, useState } from 'react'
import {
  ChevronDown,
  CircleDashed,
  Image,
  Monitor,
  MonitorPlay,
  Pause,
  Play,
  Presentation,
  Send,
  Settings,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import LivePage from './pages/LivePage.jsx'
import ServicesPage from './pages/ServicesPage.jsx'
import SongsPage from './pages/SongsPage.jsx'
import SlidesPage from './pages/SlidesPage.jsx'
import MediaPage from './pages/MediaPage.jsx'
import ScripturePage from './pages/ScripturePage.jsx'

function AudienceView() {
  const [currentText, setCurrentText] = useState(
    'For where two or three gather in my name, there am I with them.',
  )
  const [displayMode, setDisplayMode] = useState('live')

  useEffect(() => {
    if (!window.churchCast) return undefined
    const unsubscribeProjection = window.churchCast.onProjection(setCurrentText)
    const unsubscribeMode = window.churchCast.onAudienceMode(setDisplayMode)
    window.churchCast.readyAudience()
    return () => {
      unsubscribeProjection()
      unsubscribeMode()
    }
  }, [])

  if (displayMode === 'black') {
    return <main className="absolute inset-0 h-screen w-screen bg-black" />
  }

  return (
    <main className="absolute inset-0 h-screen w-screen overflow-hidden bg-black text-white select-none">
      {renderProjection(currentText)}
    </main>
  )
}

function renderMedia(media, className) {
  if (!media?.src) return null
  if (media.type === 'video') {
    return (
      <video
        src={media.src}
        aria-label={media.name || 'Audience video'}
        className={className}
        autoPlay
        loop
        muted
        playsInline
      />
    )
  }
  return <img src={media.src} alt={media.name || 'Audience photo'} className={className} />
}

function renderProjection(content, isPreview = false) {
  if (content && typeof content === 'object' && content.type === 'scripture') {
    return (
      <div className={`relative flex h-full w-full flex-col overflow-hidden bg-white text-zinc-900 ${isPreview ? '' : 'px-[4.5vw] py-[4vh]'}`}>
        {content.background && renderMedia(
          content.background,
          'absolute inset-0 size-full object-cover',
        )}
        <header
          className={`relative z-10 flex shrink-0 items-center justify-between gap-4 ${
            isPreview ? 'px-2 py-1 text-[6px]' : 'text-[clamp(1rem,2.4vw,2rem)]'
          }`}
        >
          <span className="font-normal">{content.reference}</span>
          <span className="text-right font-normal">{content.version}</span>
        </header>
        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center px-[3vw] text-center">
          <p
            className={`max-w-full font-bold leading-[1.05] ${
              isPreview
                ? 'text-[10px]'
                : 'text-[clamp(2rem,5.8vw,5rem)]'
            }`}
          >
            {content.verses.map((verse, index) => (
              <span key={`${verse.number}-${index}`}>
                <sup className={`mr-[0.12em] font-semibold ${isPreview ? 'text-[0.6em]' : 'text-[0.58em]'}`}>
                  {verse.number}
                </sup>
                {verse.content}
                {index < content.verses.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
        </div>
      </div>
    )
  }

  if (content && typeof content === 'object' && content.type === 'media') {
    return (
      <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-black ${isPreview ? '' : 'p-12'}`}>
        {renderMedia(
          content.media,
          isPreview ? 'max-h-full max-w-full object-contain' : 'h-full w-full object-contain',
        )}
      </div>
    )
  }

  if (content && typeof content === 'object' && content.type === 'text') {
    const text = content.content
    const background = content.background
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden text-center">
        {background && renderMedia(background, 'absolute inset-0 size-full object-cover')}
        <p
          className={
            isPreview
              ? 'relative z-10 text-sm font-medium leading-5 text-zinc-100 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
              : `relative z-10 max-w-6xl whitespace-pre-line text-5xl font-bold leading-relaxed tracking-wide drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] md:text-7xl ${background ? 'p-12' : ''}`
          }
        >
          {text}
        </p>
      </div>
    )
  }

  if (content && typeof content === 'object' && content.type === 'image') {
    return renderMedia(
      content,
      isPreview ? 'max-h-full max-w-full object-contain' : 'h-full w-full object-contain p-12',
    )
  }

  const text = typeof content === 'string' ? content : ''
  return (
    <div className={`flex h-full w-full items-center justify-center text-center ${isPreview ? '' : 'p-12'}`}>
      <p
      className={
        isPreview
          ? 'text-sm font-medium leading-5 text-zinc-200'
          : 'max-w-6xl whitespace-pre-line text-center text-5xl font-bold leading-relaxed tracking-wide drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] md:text-7xl'
      }
      >
        {text}
      </p>
    </div>
  )
}

function renderTabContent(activeTab, { projectText, mediaPageProps }) {
  switch (activeTab) {
    case 'Live':
      return <LivePage />
    case 'Services':
      return <ServicesPage />
    case 'Songs':
      return <SongsPage onProject={(content) => projectText(content, 'song')} />
    case 'Slides':
      return <SlidesPage />
    case 'Media':
      return <MediaPage {...mediaPageProps} />
    case 'Scripture':
    default:
      return <ScripturePage onProject={(content) => projectText(content, 'scripture')} />
  }
}

function formatPlaybackTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function MessageComposer({ id, label, value, onChange, onSend }) {
  function handleSubmit(event) {
    event.preventDefault()
    const message = value.trim()
    if (!message) return
    onSend(message)
    onChange('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-zinc-300">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type a message..."
          className="h-9 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-sky-700 focus:ring-1 focus:ring-sky-700"
        />
        <button
          type="submit"
          disabled={!value.trim()}
          aria-label={`Send ${label}`}
          title={`Send ${label}`}
          className="grid size-9 shrink-0 place-items-center rounded-md bg-zinc-800 text-zinc-300 transition hover:bg-zinc-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={14} aria-hidden="true" />
        </button>
      </div>
    </form>
  )
}

function AdminPanel({ activeTab, onTabChange }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isOutputMenuOpen, setIsOutputMenuOpen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSeconds, setPlaybackSeconds] = useState(0)
  const [stageMessage, setStageMessage] = useState('')
  const [audienceMessage, setAudienceMessage] = useState('')
  const [lastSentMessage, setLastSentMessage] = useState('')
  const [audienceContent, setAudienceContent] = useState(
    'For where two or three gather in my name',
  )
  const [mediaFiles, setMediaFiles] = useState([])
  const [backgrounds, setBackgrounds] = useState({ song: null, scripture: null })
  const [baseMedia, setBaseMedia] = useState(null)
  const [audienceMode, setAudienceModeState] = useState('live')
  const [lastTextProjection, setLastTextProjection] = useState(
    'For where two or three gather in my name',
  )
  const durationSeconds = 240
  const tabs = ['Live', 'Services', 'Songs', 'Slides', 'Media', 'Scripture']

  function sendProjection(projection) {
    setAudienceContent(projection)
    window.churchCast?.projectSlide(projection)
  }

  function setAudienceMode(mode) {
    setAudienceModeState(mode)
    window.churchCast?.setAudienceMode(mode)
  }

  function showAudienceDisplay() {
    window.churchCast?.showAudience()
    if (!window.churchCast) {
      window.open(`${window.location.origin}/#/audience`, 'churchcast-audience')
    }
  }

  function projectText(content, context) {
    if (context === 'scripture' && content?.type === 'scripture') {
      const projection = {
        ...content,
        background: backgrounds.scripture,
      }
      setLastTextProjection(projection)
      sendProjection(baseMedia ? { type: 'media', media: baseMedia } : projection)
      return
    }

    const projection = {
      type: 'text',
      content,
      background: backgrounds[context],
    }
    setLastTextProjection(projection)
    sendProjection(baseMedia ? { type: 'media', media: baseMedia } : projection)
  }

  function setBase(media) {
    setBaseMedia(media)
    sendProjection({ type: 'media', media })
  }

  function clearBase() {
    setBaseMedia(null)
    sendProjection(lastTextProjection)
  }

  const mediaPageProps = {
    mediaFiles,
    onUpload: (uploads) => setMediaFiles((current) => [...current, ...uploads]),
    onProject: (media) => sendProjection({ type: 'media', media }),
    onSetBackground: (context, media) =>
      setBackgrounds((current) => ({ ...current, [context]: media })),
    onSetBase: setBase,
    onClearBase: clearBase,
    backgrounds,
    baseMedia,
  }
  const tabProps = { projectText, mediaPageProps }

  useEffect(() => {
    if (!isPlaying) return undefined

    const intervalId = window.setInterval(() => {
      setPlaybackSeconds((seconds) => Math.min(seconds + 1, durationSeconds))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [durationSeconds, isPlaying])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-[#121212] px-4">
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-emerald-500 text-zinc-950">
            <Presentation size={17} strokeWidth={2.5} aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-white">Church Cast</span>
        </div>

        <nav
          aria-label="Main navigation"
          className="absolute left-1/2 flex max-w-[calc(100vw-12rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border border-zinc-800/80 bg-zinc-900/80 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onTabChange(tab)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-zinc-800 text-zinc-50'
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100'
                }`}
              >
                {tab === 'Live' && (
                  <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                )}
                {tab}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <span
            role="img"
            aria-label="System status ready"
            title="System status ready"
            className="grid size-8 place-items-center text-zinc-400"
          >
            <CircleDashed size={16} className="animate-spin" aria-hidden="true" />
          </span>
          <span
            role="img"
            aria-label="Audience display connected"
            title="Audience display connected"
            className="relative grid size-8 place-items-center text-zinc-400"
          >
            <Monitor size={17} aria-hidden="true" />
            <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-red-500 ring-2 ring-[#121212]" />
          </span>
          <div className="relative">
            <button
              type="button"
              aria-label="Settings"
              aria-haspopup="menu"
              aria-expanded={isSettingsOpen}
              aria-controls="settings-menu"
              title="Settings"
              onClick={() => setIsSettingsOpen((isOpen) => !isOpen)}
              className="grid size-8 place-items-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Settings size={17} aria-hidden="true" />
            </button>
            {isSettingsOpen && (
              <div
                id="settings-menu"
                role="menu"
                aria-label="Settings menu"
                className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/30"
              >
                {['Display settings', 'Preferences', 'Keyboard shortcuts'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="menuitem"
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-3.5rem)] flex-row overflow-hidden bg-[#1a1a1a]">
        <section
          aria-label="Page content workspace"
          className="h-full min-w-0 flex-1 overflow-y-auto p-4"
        >
          {renderTabContent(activeTab, tabProps)}
        </section>

        <aside className="flex h-full w-80 shrink-0 flex-col justify-between border-l border-zinc-800 bg-[#121212] p-3 text-zinc-100">
          <div className="space-y-4">
            <section aria-label="Audience output preview">
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={isOutputMenuOpen}
                  aria-haspopup="listbox"
                  aria-label="Select output display"
                  onClick={() => setIsOutputMenuOpen((isOpen) => !isOpen)}
                  className="flex h-9 w-full items-center justify-between rounded-t-md border border-sky-900/80 bg-sky-950 px-2.5 text-left text-xs font-medium text-sky-100 hover:bg-sky-900"
                >
                  <span>Main Audience Output</span>
                  <ChevronDown size={14} aria-hidden="true" />
                </button>
                {isOutputMenuOpen && (
                  <div
                    role="listbox"
                    aria-label="Audience output displays"
                    className="absolute inset-x-0 top-full z-10 rounded-b-md border border-zinc-700 bg-zinc-900 p-1 shadow-xl"
                  >
                    <button
                      type="button"
                      role="option"
                      aria-selected="true"
                      onClick={() => setIsOutputMenuOpen(false)}
                      className="w-full rounded px-2 py-1.5 text-left text-xs text-zinc-100 hover:bg-zinc-800"
                    >
                      Main Audience Output
                    </button>
                  </div>
                )}
              </div>
              <div className="grid aspect-video place-items-center rounded-b-md border border-t-0 border-zinc-800 bg-black px-4 text-center">
                {audienceMode === 'black' ? (
                  <div aria-label="Audience output is black" className="size-full bg-black" />
                ) : (
                  renderProjection(audienceContent, true)
                )}
              </div>
            </section>

            <section aria-label="Audience display controls" className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={showAudienceDisplay}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-sky-600 px-2 text-xs font-medium text-white transition hover:bg-sky-500"
                >
                  <MonitorPlay size={14} aria-hidden="true" />
                  Show Display
                </button>
                <button
                  type="button"
                  aria-pressed={audienceMode === 'freeze'}
                  onClick={() => setAudienceMode(audienceMode === 'freeze' ? 'live' : 'freeze')}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition ${
                    audienceMode === 'freeze'
                      ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  <Pause size={13} aria-hidden="true" />
                  {audienceMode === 'freeze' ? 'Unfreeze' : 'Freeze'}
                </button>
                <button
                  type="button"
                  disabled={!baseMedia}
                  onClick={() => {
                    if (!baseMedia) return
                    sendProjection({ type: 'media', media: baseMedia })
                    setAudienceMode('live')
                  }}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-zinc-800 px-2 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Image size={14} aria-hidden="true" />
                  Base
                </button>
                <button
                  type="button"
                  aria-pressed={audienceMode === 'black'}
                  onClick={() => setAudienceMode(audienceMode === 'black' ? 'live' : 'black')}
                  className={`inline-flex h-9 items-center justify-center gap-2 rounded-md px-2 text-xs font-medium transition ${
                    audienceMode === 'black'
                      ? 'bg-zinc-100 text-zinc-950 hover:bg-white'
                      : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                  }`}
                >
                  <span className="size-3 rounded-full border border-current bg-black" aria-hidden="true" />
                  {audienceMode === 'black' ? 'Show Output' : 'Black'}
                </button>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-900/70 p-2.5">
                <QRCodeSVG
                  value={`${window.location.origin}/#/audience`}
                  size={76}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#09090b"
                  aria-label="QR code for audience display"
                />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-200">Audience display QR</p>
                  <p className="mt-1 break-all text-[10px] leading-4 text-zinc-500">
                    Scan to open the audience view
                  </p>
                </div>
              </div>
            </section>

            <section aria-label="Media playback controls">
              <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-zinc-500">
                <span>{formatPlaybackTime(playbackSeconds)}</span>
                <span>{formatPlaybackTime(durationSeconds)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={durationSeconds}
                value={playbackSeconds}
                aria-label="Playback position"
                onChange={(event) => setPlaybackSeconds(Number(event.target.value))}
                className="mb-2 h-1.5 w-full cursor-pointer accent-sky-500"
              />
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Back 5 seconds"
                  title="Back 5 seconds"
                  onClick={() => setPlaybackSeconds((seconds) => Math.max(0, seconds - 5))}
                  className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <SkipBack size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                  title={isPlaying ? 'Pause' : 'Play'}
                  onClick={() => {
                    if (playbackSeconds >= durationSeconds) setPlaybackSeconds(0)
                    setIsPlaying((playing) => !playing)
                  }}
                  className="grid size-9 place-items-center rounded-full bg-zinc-100 text-zinc-950 hover:bg-white"
                >
                  {isPlaying ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" fill="currentColor" />}
                </button>
                <button
                  type="button"
                  aria-label="Forward 5 seconds"
                  title="Forward 5 seconds"
                  onClick={() => setPlaybackSeconds((seconds) => Math.min(durationSeconds, seconds + 5))}
                  className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                >
                  <SkipForward size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          </div>

          <section aria-label="Display messages" className="space-y-3 border-t border-zinc-800 pt-3">
            <MessageComposer
              id="stage-display-message"
              label="Stage Display message"
              value={stageMessage}
              onChange={setStageMessage}
              onSend={(message) => setLastSentMessage(`Stage: ${message}`)}
            />
            <MessageComposer
              id="audience-message"
              label="Audience message"
              value={audienceMessage}
              onChange={setAudienceMessage}
              onSend={(message) => setLastSentMessage(`Audience: ${message}`)}
            />
            <p aria-live="polite" className="min-h-4 truncate text-[10px] text-zinc-500">
              {lastSentMessage ? `Prepared: ${lastSentMessage}` : 'Messages are ready to prepare'}
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('Scripture')
  const [isAudienceView, setIsAudienceView] = useState(
    () => window.location.hash === '#/audience',
  )

  useEffect(() => {
    const updateView = () => setIsAudienceView(window.location.hash === '#/audience')
    window.addEventListener('hashchange', updateView)
    return () => window.removeEventListener('hashchange', updateView)
  }, [])

  return isAudienceView ? (
    <AudienceView />
  ) : (
    <AdminPanel activeTab={activeTab} onTabChange={setActiveTab} />
  )
}

export default App
