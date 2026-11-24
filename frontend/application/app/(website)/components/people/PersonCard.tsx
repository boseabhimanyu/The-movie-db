"use client";

import React from "react";
import Link from "next/link";
import type { PersonSearchItem } from "../../people/types";

interface PersonCardProps {
  person: PersonSearchItem;
}

export default function PersonCard({ person }: PersonCardProps) {
  const slugOrId =
    person.ids?.slug || (person.ids?.trakt ? String(person.ids.trakt) : "");
  const href = slugOrId ? `/people/${encodeURIComponent(slugOrId)}` : "#";
  const headshot = person.images?.headshot;

  const initials = person.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 transition hover:-translate-y-1 hover:border-amber-400/50 hover:bg-zinc-900"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
        {headshot ? (
          <img
            src={headshot}
            alt={person.name}
            loading="lazy"
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-2xl font-bold tracking-wider text-zinc-500">
            {initials || "?"}
          </div>
        )}

        {person.known_for_department && (
          <span className="absolute top-2.5 left-2.5 rounded-full border border-white/15 bg-zinc-950/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 backdrop-blur-sm">
            {person.known_for_department}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3.5">
        <div>
          <h3 className="line-clamp-1 text-sm font-bold text-white transition group-hover:text-amber-300">
            {person.name}
          </h3>

          {person.birthplace && (
            <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
              {person.birthplace}
            </p>
          )}
        </div>

        {/* {person.biography && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500">
            {person.biography}
          </p>
        )} */}
      </div>
    </Link>
  );
}