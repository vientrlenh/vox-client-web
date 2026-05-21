const stackItems = [
  { label: 'Routing', value: 'Declarative' },
  { label: 'Server data', value: 'TanStack Query' },
  { label: 'Client state', value: 'Redux Toolkit' },
  { label: 'Styling', value: 'Tailwind CSS' },
]

export function HomePage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-neutral-50 px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wide text-emerald-700">
            Feature-based starter
          </p>
          <h1 className="text-4xl font-semibold text-neutral-950 sm:text-5xl">
            Vox Client Web
          </h1>
          <p className="mt-4 text-base leading-7 text-neutral-600">
            A React TypeScript shell with routing, state, data fetching, tests,
            and utility-first styling ready for feature modules.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stackItems.map((item) => (
            <article
              key={item.label}
              className="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-neutral-500">{item.label}</p>
              <p className="mt-2 text-lg font-semibold text-neutral-950">
                {item.value}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
