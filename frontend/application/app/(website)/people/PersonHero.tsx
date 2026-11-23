"use client";

import React from "react";
import Link from "next/link";
import type { PersonDetailResponse } from "./types";

interface PersonHeroProps {
  data: PersonDetailResponse;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAge(birthday?: string, death?: string): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;

  const end = death ? new Date(death) : new Date();
  if (Number.isNaN(end.getTime())) return null;

  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function countUniqueCredits(
  acting: { ids: { trakt: number; slug: string } }[],
  departments: Record<string, { ids: { trakt: number; slug: string } }[]>
): number {
  const seen = new Set<string>();
  const add = (ids: { trakt: number; slug: string }) => {
    const key = ids.trakt ? String(ids.trakt) : ids.slug;
    if (key) seen.add(key);
  };

  acting.forEach((item) => add(item.ids));
  Object.values(departments ?? {}).forEach((items) =>
    items.forEach((item) => add(item.ids))
  );
  return seen.size;
}

export default function PersonHero({ data }: PersonHeroProps) {
  const { person, movieCredits, showCredits } = data;
  const headshotUrl = person.images?.headshot || "";
  const ambientUrl = person.images?.fanart || headshotUrl;

  const formattedBirth = formatDate(person.birthday);
  const formattedDeath = formatDate(person.death);
  const age = calculateAge(person.birthday, person.death);

  const uniqueMoviesCount = countUniqueCredits(
    movieCredits?.acting ?? [],
    movieCredits?.departments ?? {}
  );
  const uniqueShowsCount = countUniqueCredits(
    showCredits?.acting ?? [],
    showCredits?.departments ?? {}
  );
  const totalCredits = uniqueMoviesCount + uniqueShowsCount;

  const socialLinks = [
    person.ids?.imdb
      ? {
          label: "IMDb",
          href: `https://www.imdb.com/name/${person.ids.imdb}`,
        }
      : null,
    person.socialIds?.instagram
      ? {
          label: "Instagram",
          href: `https://www.instagram.com/${person.socialIds.instagram.replace(/^@/, "")}`,
        }
      : null,
    person.socialIds?.twitter
      ? {
          label: "X",
          href: `https://x.com/${person.socialIds.twitter.replace(/^@/, "")}`,
        }
      : null,
    person.socialIds?.wikipedia
      ? {
          label: "Wikipedia",
          href: person.socialIds.wikipedia.startsWith("http")
            ? person.socialIds.wikipedia
            : `https://en.wikipedia.org/wiki/${encodeURIComponent(person.socialIds.wikipedia)}`,
        }
      : null,
    person.homepage
      ? {
          label: "Website",
          href: person.homepage,
        }
      : null,
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {/* Blurred Ambient Backdrop */}
      {ambientUrl ? (
        <div className="pointer-events-none absolute inset-0">
          <img
            src={ambientUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full scale-110 object-cover object-center opacity-25 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/65" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-900/60 to-zinc-950" />
      )}

      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 lg:px-8">
        {/* Top Row: Framed Headshot | Name, Known For, Facts & Biography */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Left Portrait Column */}
          <div className="mx-auto w-56 shrink-0 sm:w-64 md:mx-0">
            {headshotUrl ? (
              <div className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/90 p-5 shadow-2xl shadow-black/70">
                <div className="relative w-full max-w-[196px] overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-lg shadow-black/80">
                  <img
                    src={headshotUrl}
                    alt={person.name}
                    loading="eager"
                    decoding="async"
                    className="block h-auto w-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="flex aspect-[2/3] w-full flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-800/80 via-zinc-900 to-zinc-950 p-6 text-center shadow-2xl shadow-black/70">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {person.knownForDepartments?.[0] || "Talent"}
                </span>

                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-2xl font-extrabold text-amber-300">
                  {getInitials(person.name) || "?"}
                </div>

                <span className="text-[11px] font-medium tracking-widest text-zinc-500 uppercase">
                  No Photo Available
                </span>
              </div>
            )}
          </div>

          {/* Right Column: Name, Departments, Metadata, Socials & Biography */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Link href="/" className="hover:text-amber-400">
                Home
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-400">People</span>
              <span className="text-zinc-600">/</span>
              <span className="truncate text-zinc-300">{person.name}</span>
            </div>

            <h1 className="line-clamp-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {person.name}
            </h1>

            {/* Known For Department Chips */}
            {person.knownForDepartments?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {person.knownForDepartments.map((dept) => (
                  <span
                    key={dept}
                    className="inline-flex items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1.5 text-xs leading-none font-semibold text-amber-300"
                  >
                    {dept}
                  </span>
                ))}
              </div>
            )}

            {/* Personal Facts Strip */}
            <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs font-medium text-zinc-300 sm:text-sm">
              {formattedBirth && (
                <span>
                  Born {formattedBirth}
                  {!formattedDeath && age !== null ? ` (Age ${age})` : ""}
                </span>
              )}
              {formattedDeath && (
                <>
                  {formattedBirth && <span className="text-zinc-600">•</span>}
                  <span>
                    Died {formattedDeath}
                    {age !== null ? ` (Age ${age})` : ""}
                  </span>
                </>
              )}
              {person.birthplace && (
                <>
                  {(formattedBirth || formattedDeath) && (
                    <span className="text-zinc-600">•</span>
                  )}
                  <span className="text-zinc-400">{person.birthplace}</span>
                </>
              )}
            </div>

            {/* External & Social Links */}
            {socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
                  >
                    <span>{link.label}</span>
                    <span className="text-[10px] text-zinc-500">↗</span>
                  </a>
                ))}
              </div>
            )}

            {/* Fixed-Height Biography Section (Theme-matched scrollbar on hover/scroll) */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Biography
              </h2>
              <div
                tabIndex={0}
                className="mt-2 h-28 overflow-y-auto pr-2 [scrollbar-width:none] hover:[scrollbar-color:#3f3f46_#09090b] hover:[scrollbar-width:thin] focus:[scrollbar-color:#3f3f46_#09090b] focus:[scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent hover:[&::-webkit-scrollbar-track]:bg-zinc-950/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-transparent hover:[&::-webkit-scrollbar-thumb]:bg-zinc-700/90 hover:[&::-webkit-scrollbar-thumb]:hover:bg-amber-400/60 focus:[&::-webkit-scrollbar-thumb]:bg-zinc-700/90"
              >
                <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed text-zinc-200 sm:text-base">
                  {person.biography?.trim() ||
                    `No biography available for ${person.name}.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Career Summary Bar */}
        <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-6 sm:gap-8">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Total Credits
              </div>
              <div className="mt-0.5 text-xl font-bold text-white">
                {totalCredits}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Movies
              </div>
              <div className="mt-0.5 text-xl font-bold text-white">
                {uniqueMoviesCount}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                TV Shows
              </div>
              <div className="mt-0.5 text-xl font-bold text-white">
                {uniqueShowsCount}
              </div>
            </div>

            {person.knownForDepartments?.[0] && (
              <>
                <div className="h-8 w-px bg-white/10" />
                <div>
                  <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                    Known For
                  </div>
                  <div className="mt-0.5 text-xl font-bold text-amber-300">
                    {person.knownForDepartments[0]}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}