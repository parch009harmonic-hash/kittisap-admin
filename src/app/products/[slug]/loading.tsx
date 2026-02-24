export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-[#f4f6fb] text-slate-900">
      <section className="mx-auto w-full max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <div className="mt-3 grid gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:mt-4 md:grid-cols-[1.05fr_1fr] md:gap-6 md:p-5">
          <div className="aspect-square rounded-2xl bg-slate-100 shimmer-skeleton" />
          <div className="space-y-3">
            <div className="h-8 w-3/4 rounded bg-slate-100 shimmer-skeleton" />
            <div className="h-28 rounded-2xl bg-amber-100 shimmer-skeleton" />
            <div className="h-24 rounded-2xl bg-slate-100 shimmer-skeleton" />
            <div className="h-20 rounded-2xl bg-slate-100 shimmer-skeleton" />
            <div className="h-11 rounded-xl bg-amber-100 shimmer-skeleton" />
          </div>
        </div>
      </section>
    </main>
  );
}
