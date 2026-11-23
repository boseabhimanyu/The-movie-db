"use client";

import React from "react";
import Link from "next/link";
import type { PersonSearchItem } from "../../people/types";

interface PersonCardProps {
  person: PersonSearchItem;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getBirthYear(birthday?: string): string {
  if (!birthday) return "";
  const year = birthday.slice(0, 4);
  return /^\d{4}$/.test(year) ? `Born ${year}` : "";
}

export default function PersonCard({ person }: PersonCardProps) {
  const slug =
    person.ids?.slug || (person.ids?.trakt ? String(person.ids.trakt) : "");
  const href = `/people/${encodeURIComponent(slug)}`;
  const headshotUrl = person.images?.headshot || "";
  const birthYear = getBirthYear(person.birthday);

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-zinc-900"
    >
      {/* Framed 2:3 Portrait Area */}
      <div className="relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-b border-white/10 bg-zinc-950/90 p-3.5">
        {headshotUrl ? (
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-md shadow-black/70">
            <img
              src={headshotUrl}
              alt={person.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-between rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/60 via-zinc-900 to-zinc-950 p-4 text-center">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              Person
            </span>

            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10 text-xl font-extrabold text-amber-300">
              {getInitials(person.name) || "?"}
            </div>

            <span className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
              No Photo
            </span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h2 className="line-clamp-1 text-base font-bold text-white transition group-hover:text-amber-300">
            {person.name}
          </h2>

          {(birthYear || person.birthplace) && (
            <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
              {[birthYear, person.birthplace].filter(Boolean).join(" • ")}
            </p>
          )}
        </div>

        <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-zinc-400">
          {person.biography?.trim() || "View filmography & credits →"}
        </p>
      </div>
    </Link>
  );
}