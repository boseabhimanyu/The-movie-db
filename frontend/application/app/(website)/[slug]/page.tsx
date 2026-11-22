import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import styles from "./editor-typography.module.css";
import "../../../styles/page-custom-styles.css";
import type { Metadata } from "next";
import { scopePageCss } from "@/lib/scope-page-css";

type Page = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  slug: string;
  visibility: "public" | "registered";
  createdAt: string;
  updatedAt: string;
  css?: string;
};

type PageResponse = {
  page: Page;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);

  return {
    title: page ? page.title : "Page Not Found",
  };
}

async function getPage(slug: string): Promise<Page | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_API_URL is not configured.");
  }

  // 1. Forward client cookies so the backend knows if the user is logged in
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const response = await fetch(
    `${apiUrl}/pages/${encodeURIComponent(slug)}`,
    {
      cache: "no-store",
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    },
  );

  // 2. Page doesn't exist
  if (response.status === 404) {
    return null;
  }

  // 3. Page is registered-only and user is unauthenticated or unauthorized
  if (response.status === 401 || response.status === 403) {
    redirect(`/login?callbackUrl=/${encodeURIComponent(slug)}`);
  }

  // 4. Any unexpected 500 error
  if (!response.ok) {
    throw new Error("Unable to load page.");
  }

  const data = (await response.json()) as PageResponse;
  return data.page ?? null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await getPage(slug);

  if (!page) {
    notFound();
  }

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

        <div
          className={`page-content-scope ${styles.typographyContainer} mt-8 text-zinc-200`}
        >
          <style>{scopePageCss(page.css ?? "")}</style>

          <div
            dangerouslySetInnerHTML={{
              __html: page.content,
            }}
          />
        </div>
      </article>
    </main>
  );
}