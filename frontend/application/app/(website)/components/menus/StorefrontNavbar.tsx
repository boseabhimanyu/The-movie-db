"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  ChevronDown,
  Clapperboard,
  Eye,
  Film,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Search,
  ShieldCheck,
  Tv,
  User as UserIcon,
  Users,
  X,
} from "lucide-react";

import api from "@/lib/api";
import type { User } from "@/lib/types";

type AuthResponse = {
  user?: User | null;
  data?: {
    user?: User | null;
  };
};

type StorefrontNavbarProps = {
  initialUser?: User | null;
};

function SearchQuerySync({
  pathname,
  onSync,
}: {
  pathname: string;
  onSync: (value: string) => void;
}) {
  const searchParams = useSearchParams();
  const q = pathname === "/search" ? searchParams.get("q") ?? "" : "";

  useEffect(() => {
    if (pathname === "/search") {
      onSync(q);
    }
  }, [pathname, q, onSync]);

  return null;
}

export default function StorefrontNavbar({
  initialUser = null,
}: StorefrontNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(initialUser);
  const [authLoading, setAuthLoading] = useState(!initialUser);
  const [signingOut, setSigningOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const hasCheckedSession = useRef(Boolean(initialUser));

  useEffect(() => {
    setUser(initialUser);
    if (initialUser) {
      hasCheckedSession.current = true;
      setAuthLoading(false);
    }
  }, [initialUser]);

  const checkSession = useCallback(async () => {
    if (hasCheckedSession.current) return;
    hasCheckedSession.current = true;

    try {
      const response = await api.get<AuthResponse>("/auth/me");
      const currentUser =
        response.data.user ?? response.data.data?.user ?? null;
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setMobileOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);

    try {
      await api.post("/auth/logout");
      setUser(null);
      setAccountMenuOpen(false);
      setMobileOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      setUser(null);
      setAccountMenuOpen(false);
      setMobileOpen(false);
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const isAdmin = user?.role?.toLowerCase() === "admin";

  const avatarUrl = user?.profilePic
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "")}/${user.profilePic}`
    : "";

  const displayName = user
    ? user.firstName
      ? `${user.firstName} ${user.lastName ?? ""}`.trim()
      : user.username
    : "";

  const initials = user
    ? (user.firstName?.[0] || user.username?.[0] || "U").toUpperCase()
    : "U";

  const navLinks = [
    {
      label: "Movies",
      href: "/movies",
      icon: Clapperboard,
      active: pathname === "/movies" || pathname.startsWith("/movies/"),
    },
    {
      label: "TV Shows",
      href: "/shows",
      icon: Tv,
      active: pathname === "/shows" || pathname.startsWith("/shows/"),
    },
    {
      label: "People",
      href: "/people",
      icon: Users,
      active: pathname === "/people" || pathname.startsWith("/people/"),
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/90 backdrop-blur-xl">
      <Suspense fallback={null}>
        <SearchQuerySync pathname={pathname} onSync={setSearchQuery} />
      </Suspense>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Left: Brand + Primary Catalog Links */}
        <div className="flex items-center gap-7">
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

          <nav
            aria-label="Primary storefront navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    link.active
                      ? "bg-amber-400/15 text-amber-300"
                      : "text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center: Quick Search Bar (Desktop) */}
        <form
          onSubmit={handleSearchSubmit}
          className="hidden max-w-md flex-1 lg:block"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, shows, or people..."
              className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900/90 pr-4 pl-10 text-sm text-white placeholder:text-zinc-500 transition focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
            />
          </div>
        </form>

        {/* Right: Bookmarks + My Account / Sign In */}
        <div className="hidden items-center gap-2.5 md:flex">
          <Link
            href="/bookmarks"
            className={`inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border pr-4 pl-3.5 text-base font-medium transition ${
              pathname === "/bookmarks"
                ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                : "border-white/10 bg-zinc-900/90 text-white hover:border-amber-400/40 hover:bg-zinc-900"
            }`}
          >
            <Bookmark className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Bookmarks</span>
          </Link>

          {authLoading ? (
            <div className="h-10 w-32 animate-pulse rounded-xl bg-white/[0.06]" />
          ) : user ? (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                aria-expanded={accountMenuOpen}
                className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900/90 px-3.5 text-base font-medium text-white transition hover:border-amber-400/40 hover:bg-zinc-900"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-6 w-6 rounded-full object-cover ring-1 ring-amber-400/40"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold text-amber-300 uppercase">
                    {initials}
                  </span>
                )}
                <span>My Account</span>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-400 transition-transform ${
                    accountMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl">
                  <div className="border-b border-white/10 px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    {user.username && (
                      <p className="truncate text-xs text-zinc-400">
                        @{user.username}
                      </p>
                    )}
                  </div>

                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        href="/dashboard"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white"
                      >
                        <LayoutDashboard className="h-4 w-4 text-amber-400" />
                        Dashboard
                      </Link>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <UserIcon className="h-4 w-4 text-amber-400" />
                      My Profile
                    </Link>

                    <Link
                      href="/security"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <ShieldCheck className="h-4 w-4 text-amber-400" />
                      Security
                    </Link>

                    <Link
                      href="/bookmarks"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <Bookmark className="h-4 w-4 text-amber-400" />
                      Saved Bookmarks
                    </Link>

                    <Link
                      href="/watched"
                      onClick={() => setAccountMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/[0.07] hover:text-white"
                    >
                      <Eye className="h-4 w-4 text-amber-400" />
                      Watched History
                    </Link>
                  </div>

                  <div className="border-t border-white/10 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {signingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-amber-400 px-4 text-sm font-semibold text-zinc-950 shadow-md shadow-amber-500/15 transition hover:bg-amber-300"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900/90 px-4 text-sm font-medium text-zinc-200 transition hover:border-white/20 hover:text-white"
              >
                Register
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 transition hover:bg-zinc-800 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <MenuIcon className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-zinc-950 px-4 pt-3 pb-5 md:hidden">
          <form onSubmit={handleSearchSubmit} className="mb-4">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search movies, shows, or people..."
                className="h-10 w-full rounded-xl border border-white/10 bg-zinc-900 pr-4 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400/60 focus:outline-none"
              />
            </div>
          </form>

          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                    link.active
                      ? "bg-amber-400/15 text-amber-300"
                      : "text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/bookmarks"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <Bookmark className="h-4 w-4 text-amber-400" />
              Bookmarks
            </Link>

            <Link
              href="/watched"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
            >
              <Eye className="h-4 w-4 text-amber-400" />
              Watched History
            </Link>
          </div>

          <div className="mt-4 border-t border-white/10 pt-4">
            {user ? (
              <div className="space-y-1">
                {isAdmin && (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <LayoutDashboard className="h-4 w-4 text-amber-400" />
                    Dashboard
                  </Link>
                )}

                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
                >
                  <UserIcon className="h-4 w-4 text-amber-400" />
                  My Profile ({user.username})
                </Link>

                <Link
                  href="/security"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.06]"
                >
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Security
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl bg-amber-400 text-sm font-semibold text-zinc-950"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-sm font-medium text-zinc-200"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}