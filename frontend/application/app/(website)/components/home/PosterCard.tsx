"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play, Star } from "lucide-react";
import ArtworkPlaceholder from "./ArtworkPlaceholder";
import {
  decodedImageCache,
  MediaItem,
  toFanartPreviewUrl,
} from "./media-types";

export default function PosterCard({
  item,
  fluid = false,
}: {
  item: MediaItem;
  fluid?: boolean;
}) {
  const detailHref = `/${item.type === "movie" ? "movies" : "shows"}/${item.slug}`;
  const previewUrl = toFanartPreviewUrl(item.posterUrl);

  const [imgSrc, setImgSrc] = useState<string | undefined>(previewUrl);
  const [loaded, setLoaded] = useState<boolean>(() =>
    Boolean(previewUrl && decodedImageCache.has(previewUrl)),
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextUrl = toFanartPreviewUrl(item.posterUrl);
    setImgSrc(nextUrl);
    setLoaded(Boolean(nextUrl && decodedImageCache.has(nextUrl)));
  }, [item.posterUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0 && imgSrc) {
      decodedImageCache.add(imgSrc);
      setLoaded(true);
    }
  }, [imgSrc]);

  function handleImageLoad() {
    if (imgSrc) {
      decodedImageCache.add(imgSrc);
    }
    setLoaded(true);
  }

  function handleImageError() {
    if (imgSrc && item.posterUrl && imgSrc !== item.posterUrl) {
      const fallbackAlreadyCached = decodedImageCache.has(item.posterUrl);
      setImgSrc(item.posterUrl);
      setLoaded(fallbackAlreadyCached);
      return;
    }
    setImgSrc(undefined);
  }

  return (
    <Link
      href={detailHref}
      className={
        fluid
          ? "group relative block w-full"
          : "group relative w-40 shrink-0 snap-start sm:w-44 md:w-48 lg:w-[calc((100%-80px)/6)]"
      }
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-lg transition duration-300 group-hover:-translate-y-1 group-hover:border-amber-400/50 group-hover:shadow-amber-500/10">
        {imgSrc ? (
          <>
            {!loaded && (
              <div className="absolute inset-0 animate-pulse bg-zinc-800/80" />
            )}
            <img
              ref={imgRef}
              src={imgSrc}
              alt={item.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </>
        ) : (
          <ArtworkPlaceholder
            title={item.title}
            type={item.type}
            year={item.year}
            variant="poster"
          />
        )}

        {item.rating && (
          <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-zinc-950/85 px-2 py-0.5 text-[11px] font-semibold text-amber-300 backdrop-blur-md">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {item.rating}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300">
            <Play className="h-3 w-3 fill-amber-300" />
            View details
          </span>
        </div>
      </div>

      <div className="mt-2.5 space-y-0.5 px-0.5">
        <h3 className="truncate text-sm font-semibold text-zinc-100 transition group-hover:text-amber-300">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {item.year && <span>{item.year}</span>}
          {item.year && item.genres[0] && <span>•</span>}
          {item.genres[0] && (
            <span className="truncate capitalize">{item.genres[0]}</span>
          )}
        </div>
      </div>
    </Link>
  );
}