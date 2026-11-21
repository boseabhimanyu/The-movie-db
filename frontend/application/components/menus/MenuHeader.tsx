"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import MenuLink from "./MenuLink";
import type { Menu, MenuItem } from "./menu-types";

export default function MenuHeader({ menu }: { menu: Menu }) {
  if (!menu.status) {
    return null;
  }

  const topItems = (menu.items ?? [])
    .filter((item) => item.displayStatus)
    .sort((a, b) => a.order - b.order);

  if (topItems.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-white/10 bg-zinc-900/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-2 text-xs sm:px-6 lg:px-8">
        {menu.name && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-0.5 font-medium text-amber-300">
            <Sparkles className="h-3 w-3" />
            {/* {menu.name} */}
          </span>
        )}

        <nav
          aria-label={menu.name || "Featured navigation"}
          className="flex items-center gap-1.5"
        >
          {topItems.map((item) => (
            <RibbonItem key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </div>
  );
}

function RibbonItem({ item }: { item: MenuItem }) {
  const children = (item.children ?? [])
    .filter((child) => child.displayStatus)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="group relative shrink-0">
      <div className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium text-zinc-300 transition hover:bg-white/[0.07] hover:text-amber-300">
        <MenuLink item={item} />
        {children.length > 0 && (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition group-hover:text-amber-300" />
        )}
      </div>

      {children.length > 0 && (
        <div className="invisible absolute top-full left-0 z-30 mt-1 min-w-[180px] rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 opacity-0 shadow-xl shadow-black/60 backdrop-blur-xl transition-all group-hover:visible group-hover:opacity-100">
          {children.map((child) => (
            <div
              key={child.id}
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-white/[0.07] hover:text-amber-300"
            >
              <MenuLink item={child} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}