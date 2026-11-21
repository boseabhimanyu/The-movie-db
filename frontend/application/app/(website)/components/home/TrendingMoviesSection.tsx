"use client";

import { Flame } from "lucide-react";
import MediaRail from "./MediaRail";
import type { MediaItem } from "./media-types";

export default function TrendingMoviesSection({
  items,
}: {
  items: MediaItem[];
}) {
  return (
    <MediaRail
      title="Trending Movies"
      subtitle="Most watched films right now"
      icon={<Flame className="h-4 w-4 text-amber-400" />}
      viewAllHref="/movies?sort=trending"
      items={items}
      emptyLabel="No trending movies match the selected filters."
      itemsPerStep={2}
    />
  );
}