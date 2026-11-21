"use client";

import { Film } from "lucide-react";
import MediaRail from "./MediaRail";
import type { MediaItem } from "./media-types";

export default function PopularMoviesSection({
  items,
}: {
  items: MediaItem[];
}) {
  return (
    <MediaRail
      title="Popular Movies"
      subtitle="All-time audience favorites"
      icon={<Film className="h-4 w-4 text-amber-400" />}
      viewAllHref="/movies?sort=popular"
      items={items}
      emptyLabel="No popular movies match the selected filters."
      itemsPerStep={2}
    />
  );
}