// Route-level skeleton for the asset dashboard. Shown instantly on tab navigation while RSC data streams in.
export default function HomeLoading() {
  return (
    <>
      <header>
        <div className="mx-auto flex min-h-22 max-w-7xl items-center justify-between gap-4 px-4 pt-5 pb-3 md:min-h-24 md:px-8 md:pt-7 md:pb-4">
          <div className="flex items-center gap-3">
            <div className="size-8 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="grid shrink-0 grid-cols-1 gap-2">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-3 pb-28 md:px-8">
        <div className="h-28 animate-pulse rounded-xl bg-muted sm:h-24" />
        <div className="space-y-3">
          <div className="h-8 w-36 animate-pulse rounded-md bg-muted" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </main>
    </>
  );
}
