"use client";

import { Tv } from "lucide-react";
import MediaRail from "./MediaRail";
import type { MediaItem } from "./media-types";

export default function TrendingShowsSection({
  items,
}: {
  items: MediaItem[];
}) {
  return (
    <MediaRail
      title="Trending TV Shows"
      subtitle="Series dominating conversations today"
      icon={<Tv className="h-4 w-4 text-amber-400" />}
      viewAllHref="/shows?sort=trending"
      items={items}
      emptyLabel="No trending shows match the selected filters."
      itemsPerStep={2}
    />
  );
}