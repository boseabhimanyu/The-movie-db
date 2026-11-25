interface DetailPageSkeletonProps {
  variant?: "media" | "person";
  showSeasons?: boolean;
}

export default function DetailPageSkeleton({
  variant = "media",
  showSeasons = false,
}: DetailPageSkeletonProps) {
  const isPerson = variant === "person";

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* Hero / Profile Header Skeleton */}
      <div className="border-b border-white/10 bg-zinc-900/40 pt-10 pb-12">
        <div className="mx-auto flex max-w-6xl animate-pulse flex-col gap-8 px-4 sm:px-6 md:flex-row lg:px-8">
          <div
            className={`mx-auto shrink-0 rounded-2xl bg-zinc-900 ring-1 ring-white/10 md:mx-0 ${
              isPerson ? "aspect-[3/4] w-48 sm:w-56" : "aspect-[2/3] w-56 sm:w-64"
            }`}
          />

          <div className="flex-1 space-y-5 pt-2">
            {!isPerson && (
              <div className="flex gap-2">
                <div className="h-6 w-16 rounded-full bg-zinc-900" />
                <div className="h-6 w-20 rounded-full bg-zinc-900" />
                <div className="h-6 w-24 rounded-full bg-zinc-900" />
              </div>
            )}

            <div className="h-10 w-3/4 rounded-xl bg-zinc-900" />
            <div className="h-4 w-1/2 rounded-lg bg-zinc-900" />

            <div className="space-y-2.5 pt-2">
              <div className="h-4 w-full rounded bg-zinc-900" />
              <div className="h-4 w-11/12 rounded bg-zinc-900" />
              <div className="h-4 w-4/5 rounded bg-zinc-900" />
            </div>

            {!isPerson && (
              <div className="flex flex-wrap gap-3 pt-4">
                <div className="h-11 w-36 rounded-xl bg-zinc-900" />
                <div className="h-11 w-32 rounded-xl bg-zinc-900" />
                <div className="h-11 w-28 rounded-xl bg-zinc-900" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lower Content Skeleton */}
      <div className="mx-auto mt-10 max-w-6xl animate-pulse space-y-8 px-4 sm:px-6 lg:px-8">
        {isPerson ? (
          <div className="space-y-4">
            <div className="h-6 w-40 rounded-lg bg-zinc-900" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2.5">
                  <div className="aspect-[2/3] w-full rounded-xl bg-zinc-900" />
                  <div className="h-4 w-4/5 rounded bg-zinc-900" />
                  <div className="h-3 w-1/2 rounded bg-zinc-900" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="h-6 w-32 rounded-lg bg-zinc-900" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/60 p-3"
                  >
                    <div className="h-12 w-12 shrink-0 rounded-full bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-3/4 rounded bg-zinc-800" />
                      <div className="h-3 w-1/2 rounded bg-zinc-800" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showSeasons && <div className="h-40 w-full rounded-2xl bg-zinc-900/60" />}
          </>
        )}
      </div>
    </main>
  );
}