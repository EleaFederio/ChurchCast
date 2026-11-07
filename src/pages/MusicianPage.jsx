import { useEffect, useState } from 'react'

export default function MusicianPage() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const apiPort = Number(params.get('apiPort'))
  const isConfigured =
    Boolean(token) && Number.isInteger(apiPort) && apiPort >= 1 && apiPort <= 65535
  const [song, setSong] = useState(null)
  const [connection, setConnection] = useState(isConfigured ? 'connecting' : 'error')
  const [connectionError, setConnectionError] = useState(
    isConfigured ? '' : 'Open this page using the musician QR code in Church Cast.',
  )

  useEffect(() => {
    if (!isConfigured) return undefined

    const eventUrl = new URL(
      `/api/events?token=${encodeURIComponent(token)}`,
      `${window.location.protocol}//${window.location.hostname}:${apiPort}`,
    )
    const events = new EventSource(eventUrl)
    events.addEventListener('update', (event) => {
      try {
        setSong(JSON.parse(event.data))
        setConnectionError('')
      } catch (error) {
        console.error('Unable to read the current musician slide.', error)
        setConnectionError('The current slide could not be read.')
      }
    })
    events.onopen = () => {
      setConnection('connected')
      setConnectionError('')
    }
    events.onerror = () => setConnection('disconnected')

    return () => events.close()
  }, [apiPort, isConfigured, token])

  const lines = song?.lines || []

  return (
    <main className="min-h-screen bg-zinc-950 px-5 pb-10 pt-5 text-zinc-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Church Cast
            </p>
            <h1 className="mt-1 text-lg font-semibold">Musician monitor</h1>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              connection === 'connected'
                ? 'border-emerald-800 bg-emerald-950 text-emerald-300'
                : connection === 'error'
                  ? 'border-red-900 bg-red-950 text-red-300'
                  : 'border-amber-800 bg-amber-950 text-amber-300'
            }`}
          >
            {connection === 'connected'
              ? 'Connected'
              : connection === 'error'
                ? 'Setup needed'
                : connection === 'disconnected'
                  ? 'Reconnecting…'
                  : 'Connecting…'}
          </span>
        </header>

        {connectionError ? (
          <p role="alert" className="mt-8 rounded-lg border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-200">
            {connectionError}
          </p>
        ) : song ? (
          <>
            <section className="mt-6 border-b border-zinc-800 pb-5">
              <p className="text-xs font-medium uppercase tracking-widest text-sky-400">
                {song.section || 'Now playing'}
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{song.title}</h2>
              <p className="mt-1 text-sm text-zinc-400">{song.artist}</p>
            </section>

            <section aria-label="Current lyrics and chords" className="space-y-5 pt-6">
              {lines.map((line, index) => (
                <div key={`${index}-${line.lyrics}`} className="overflow-x-auto">
                  <p className="w-max min-w-full whitespace-pre font-mono text-lg font-bold leading-7 text-amber-300 sm:text-xl">
                    {line.chords || '\u00a0'}
                  </p>
                  <p className="w-max min-w-full whitespace-pre font-mono text-lg leading-8 text-white sm:text-xl sm:leading-10">
                    {line.lyrics}
                  </p>
                </div>
              ))}
              {lines.length === 0 && (
                <p className="whitespace-pre-wrap text-xl leading-8 text-white sm:text-2xl">
                  {song.content}
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="mt-16 text-center">
            <p className="text-lg font-medium text-zinc-200">Waiting for the next song slide</p>
            <p className="mt-2 text-sm text-zinc-500">
              Keep this page open. It will update when a song slide is projected.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
