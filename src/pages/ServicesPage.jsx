import {
  BookOpen,
  EllipsisVertical,
  GraduationCap,
  Image,
  List,
  Music2,
  PanelsTopLeft,
  Plus,
} from 'lucide-react'

const quickStartItems = [
  { label: 'Tour', Icon: GraduationCap },
  { label: 'Services', Icon: List },
  { label: 'Songs', Icon: Music2 },
  { label: 'Slides', Icon: PanelsTopLeft },
  { label: 'Media', Icon: Image },
  { label: 'Scripture', Icon: BookOpen, hasPlus: true },
]

export default function ServicesPage() {
  return (
    <main className="flex min-h-screen flex-row bg-zinc-900 p-6 text-zinc-100">
      <aside className="flex w-48 shrink-0 items-center justify-center rounded-md border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-400">
        To begin, select a service from the Services list. Your service items will appear here.
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4 pl-4">
        <section aria-labelledby="quick-start-title">
          <h1 id="quick-start-title" className="mb-3 text-sm font-semibold text-zinc-200">
            Quick start
          </h1>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {quickStartItems.map(({ label, Icon, hasPlus }) => (
              <button
                key={label}
                type="button"
                className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-800/50 p-4 text-center text-xs text-zinc-200 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                <span className="relative grid size-6 place-items-center">
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  {hasPlus && (
                    <Plus
                      size={11}
                      strokeWidth={2.5}
                      className="absolute -bottom-1 -right-1 rounded-full bg-zinc-800"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section aria-labelledby="upcoming-services-title">
          <h2 id="upcoming-services-title" className="mb-3 text-sm font-semibold text-zinc-200">
            Upcoming services
          </h2>
          <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50">
            <div className="grid grid-cols-[5rem_minmax(8rem,0.8fr)_minmax(0,1.5fr)_2rem] items-center gap-3 border-b border-zinc-800 px-4 py-2.5 text-[11px] font-medium text-zinc-500">
              <span>Date</span>
              <span>Type</span>
              <span>Title</span>
              <span aria-hidden="true" />
            </div>
            <div className="grid grid-cols-[5rem_minmax(8rem,0.8fr)_minmax(0,1.5fr)_2rem] items-center gap-3 px-4 py-3 text-xs text-zinc-200">
              <span className="text-zinc-400">Dec 27</span>
              <span>Sunday Morning</span>
              <span className="truncate">Sample Worship Service</span>
              <button
                type="button"
                aria-label="More actions for Sample Worship Service"
                title="More actions"
                className="grid size-7 place-items-center rounded text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <EllipsisVertical size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-sky-600 px-4 text-sm font-medium text-white transition-colors hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
            >
              <Plus size={16} aria-hidden="true" />
              Add a new service
            </button>
          </div>
        </section>
      </section>
    </main>
  )
}