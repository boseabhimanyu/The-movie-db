"use client";

import React, { useEffect } from "react";

interface PosterModalProps {
  open: boolean;
  movieTitle: string;
  fullImageUrl: string;
  onClose: () => void;
}

export default function PosterModal({
  open,
  movieTitle,
  fullImageUrl,
  onClose,
}: PosterModalProps) {
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

  if (!open || !fullImageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${movieTitle} full poster`}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="truncate text-sm font-bold text-white">
            {movieTitle} — Full Poster
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close full poster"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex items-center justify-center overflow-auto bg-zinc-950 p-3">
          <img
            src={fullImageUrl}
            alt={`${movieTitle} full resolution poster`}
            className="max-h-[80vh] w-auto rounded-xl object-contain"
          />
        </div>
      </div>
    </div>
  );
}