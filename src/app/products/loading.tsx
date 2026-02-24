export default function ProductsLoading() {
  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <div className="h-24 rounded-2xl border border-slate-200 bg-white shadow-sm md:h-28 shimmer-skeleton" />
        <div className="sticky top-[62px] z-20 mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:top-[74px] md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 rounded-lg bg-slate-100 shimmer-skeleton" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 md:mt-4 md:grid-cols-4 md:gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100 shimmer-skeleton" />
              <div className="space-y-2.5 p-2.5 md:p-3">
                <div className="h-3 w-full rounded bg-slate-100 shimmer-skeleton" />
                <div className="h-3 w-3/4 rounded bg-slate-100 shimmer-skeleton" />
                <div className="h-4 w-1/2 rounded bg-amber-100 shimmer-skeleton" />
                <div className="h-6 rounded bg-slate-100 shimmer-skeleton" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
