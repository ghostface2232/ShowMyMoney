// Route-level skeleton for the expense dashboard content. The header persists in the
// (app) layout, so only the area below it is mocked while RSC data streams in.
export default function ExpensesLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-3 pb-28 md:px-8">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-10 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="h-28 animate-pulse rounded-xl bg-muted sm:h-24" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}
