export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="h-40 animate-pulse rounded-3xl border border-amber-500/25 bg-black/45" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-amber-500/25 bg-black/45">
              <div className="h-44 animate-pulse bg-zinc-800/70" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-700/70" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-700/70" />
                <div className="h-8 animate-pulse rounded bg-zinc-700/70" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
