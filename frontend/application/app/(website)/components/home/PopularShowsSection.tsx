"use client";

import { Sparkles } from "lucide-react";
import MediaRail from "./MediaRail";
import type { MediaItem } from "./media-types";

export default function PopularShowsSection({
  items,
}: {
  items: MediaItem[];
}) {
  return (
    <MediaRail
      title="Popular TV Shows"
      subtitle="Binge-worthy television classics & hits"
      icon={<Sparkles className="h-4 w-4 text-amber-400" />}
      viewAllHref="/shows?sort=popular"
      items={items}
      emptyLabel="No popular shows match the selected filters."
    />
  );
}