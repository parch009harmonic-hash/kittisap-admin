export default function ProductDetailLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mt-4 grid gap-5 rounded-3xl border border-amber-500/30 bg-black/55 p-4 md:grid-cols-[1.1fr_1fr] md:p-6">
          <div className="h-[300px] animate-pulse rounded-2xl bg-zinc-800 md:h-[430px]" />
          <div className="space-y-3">
            <div className="h-9 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="h-10 animate-pulse rounded-xl bg-zinc-800" />
          </div>
        </div>
      </section>
    </main>
  );
}
