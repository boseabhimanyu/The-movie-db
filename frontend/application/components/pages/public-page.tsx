"use client";

import PageContent from "@/components/pages/page-content";
import type { Page } from "@/lib/types";

type PublicPageProps = {
  page: Page;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function PublicPage({
  page,
}: PublicPageProps) {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8 lg:p-10">
        <header className="border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {page.title}
            </h1>

            {page.visibility === "registered" && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300">
                Registered Only
              </span>
            )}
          </div>

          {/* <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-zinc-400">
            <span>Created {formatDate(page.createdAt)}</span>
            <span className="text-zinc-600">•</span>
            <span>Updated {formatDate(page.updatedAt)}</span>
          </div> */}
        </header>

        <div className="mt-8 text-zinc-200">
          <PageContent
            content={page.content}
            css={page.css ?? ""}
          />
        </div>
      </article>
    </main>
  );
}