import Link from "next/link";
import { Film } from "lucide-react";
import MenuLink from "./MenuLink";
import type { Menu } from "./menu-types";

export default function MenuFooter({ menu }: { menu: Menu }) {
  const activeGroups =
    menu && menu.status
      ? (menu.items ?? [])
          .filter((item) => item.displayStatus)
          .sort((a, b) => a.order - b.order)
      : [];

  return (
    <footer className="border-t border-white/10 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          {/* Brand Column */}
          <div className="space-y-4 lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-white transition hover:opacity-90"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 shadow-md shadow-amber-500/20">
                <Film className="h-4.5 w-4.5 stroke-[2.25]" />
              </span>
              <span className="text-lg font-bold tracking-tight">
                Cine<span className="text-amber-400">Vault</span>
              </span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
              Discover trending cinema and television across global regions,
              curate your personal watchlist, and explore 4K artwork.
            </p>
          </div>

          {/* Backend-Managed Footer Menu Columns */}
          {activeGroups.length > 0 && (
            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 lg:col-span-8">
              {activeGroups.map((group) => {
                const links = (group.children ?? [])
                  .filter((child) => child.displayStatus)
                  .sort((a, b) => a.order - b.order);

                return (
                  <section key={group.id} className="space-y-3">
                    <h3 className="text-xs font-semibold tracking-wider text-white uppercase [&_a]:transition [&_a:hover]:text-amber-300">
                      <MenuLink item={group} />
                    </h3>

                    {links.length > 0 && (
                      <ul className="space-y-2.5 text-sm">
                        {links.map((link) => (
                          <li
                            key={link.id}
                            className="[&_a]:text-zinc-400 [&_a]:transition [&_a:hover]:text-amber-300"
                          >
                            <MenuLink item={link} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Copyright Bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500 sm:flex-row">
          <p>© {new Date().getFullYear()} CineVault. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link href="/movies" className="transition hover:text-zinc-300">
              Movies
            </Link>
            <Link href="/shows" className="transition hover:text-zinc-300">
              TV Shows
            </Link>
            <Link href="/bookmarks" className="transition hover:text-zinc-300">
              Bookmarks
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}