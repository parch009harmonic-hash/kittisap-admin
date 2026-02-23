export default function ContactLoading() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,_#5c3f00_0%,_#1a1200_30%,_#090909_68%)] text-amber-50">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="h-40 animate-pulse rounded-3xl border border-amber-500/25 bg-black/45" />
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_1fr]">
          <div className="h-80 animate-pulse rounded-2xl border border-amber-500/25 bg-black/45" />
          <div className="h-80 animate-pulse rounded-2xl border border-amber-500/25 bg-black/45" />
        </div>
      </section>
    </main>
  );
}
