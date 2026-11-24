"use client";

import React, { useEffect } from "react";

interface TrailerModalProps {
  open: boolean;
  movieTitle: string;
  youtubeId: string | null;
  onClose: () => void;
}

export default function TrailerModal({
  open,
  movieTitle,
  youtubeId,
  onClose,
}: TrailerModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !youtubeId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${movieTitle} trailer`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="truncate text-sm font-bold text-white sm:text-base">
            {movieTitle} — Official Trailer
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close trailer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={`${movieTitle} trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}