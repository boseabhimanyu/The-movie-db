"use client";

import axios from "axios";
import Link from "next/link";
import {
  AtSign,
  Bookmark,
  Calendar,
  Camera,
  Check,
  Eye,
  FileText,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import api from "@/lib/api";
import type { User } from "@/lib/types";
import { useNotification } from "@/components/notifications/notification-provider";

type ProfileFormProps = {
  user: User;
};

type CountryOption = {
  code: string;
  name: string;
};

const MAX_BIO_LENGTH = 500;

function formatDateForApi(value: string) {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "";
  const [, year, month, day] = match;
  return `${day}-${month}-${year}`;
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month}-${day}`;
  }
  const dmyMatch = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month}-${day}`;
  }
  return "";
}

export default function ProfileFormRoot({ user }: ProfileFormProps) {
  const { showNotification } = useNotification();

  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    formatDateForInput(user.dateOfBirth),
  );
  const [country, setCountry] = useState(user.country ?? "");
  const [bio, setBio] = useState(user.bio ?? "");

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const [profilePic, setProfilePic] = useState(user.profilePic ?? "");
  const [profileImageLoading, setProfileImageLoading] = useState(false);
  const [showProfileImage, setShowProfileImage] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchCountries() {
      setCountriesLoading(true);
      try {
        const response = await api.get("/countries");
        if (active && Array.isArray(response.data?.countries)) {
          setCountries(response.data.countries);
        }
      } catch {
        // Keep current country code selectable even if list fails to load
      } finally {
        if (active) setCountriesLoading(false);
      }
    }

    fetchCountries();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const apiDateOfBirth = formatDateForApi(dateOfBirth);

      const response = await api.patch("/auth/me", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: apiDateOfBirth,
        country: country.trim(),
        bio: bio.trim(),
      });

      if (response.data?.user) {
        setBio(response.data.user.bio ?? "");
        setCountry(response.data.user.country ?? "");
      }

      showNotification(
        response.data?.message ?? "Profile updated successfully.",
        "success",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to update profile.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profile_pic", file);

    setProfileImageLoading(true);

    try {
      const response = await api.patch("/auth/me/image", formData);
      showNotification(
        response.data?.message ?? "Profile picture updated successfully.",
        "success",
      );
      window.location.reload();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to update profile picture.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setProfileImageLoading(false);
      event.target.value = "";
    }
  }

  async function handleProfileImageRemove() {
    if (!profilePic) return;

    setProfileImageLoading(true);

    try {
      const response = await api.delete("/auth/me/image");
      setProfilePic("");
      setShowProfileImage(false);
      showNotification(
        response.data?.message ?? "Profile picture removed successfully.",
        "success",
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        showNotification(
          error.response?.data?.message ??
            error.response?.data?.error ??
            "Unable to remove profile picture.",
          "error",
        );
      } else {
        showNotification("Unable to connect to the server.", "error");
      }
    } finally {
      setProfileImageLoading(false);
    }
  }

  const profileImageUrl = profilePic
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace("/api/v1", "")}/${profilePic}`
    : "";

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || username || "Member";
  const selectedCountryName =
    countries.find((c) => c.code === country)?.name || country;

  return (
    <>
      {/* Top Cinema Strip Banner */}
      <div className="relative h-36 w-full overflow-hidden border-b border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 sm:h-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(251,191,36,0.14),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(245,158,11,0.08),transparent_50%)]" />
        <div className="mx-auto flex h-full max-w-[1280px] items-start justify-between px-4 pt-6 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/70 px-3 py-1 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase backdrop-blur-md">
            Member Profile
          </span>

          {/* Account Sub-Navigation Pills */}
          <nav className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950/80 p-1 backdrop-blur-md">
            <span className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-semibold text-zinc-950">
              Profile
            </span>
            <Link
              href="/security"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              Security
            </Link>
          </nav>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="relative z-10 mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT RAIL: Live Identity Card & Quick Shortcuts */}
          <aside className="relative z-10 -mt-14 space-y-5 lg:col-span-4">
            <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
              {/* Avatar with Floating Camera Action */}
              <div className="flex items-end justify-between gap-4">
                <div className="relative h-24 w-24 shrink-0">
                  <div className="h-full w-full overflow-hidden rounded-2xl border-2 border-amber-400/40 bg-zinc-950 shadow-xl">
                    {profilePic ? (
                      <button
                        type="button"
                        onClick={() => setShowProfileImage(true)}
                        className="block h-full w-full cursor-zoom-in"
                        aria-label="View profile picture"
                      >
                        <img
                          src={profileImageUrl}
                          alt={displayName}
                          className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                        />
                      </button>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-400/20 via-zinc-900 to-zinc-950 text-2xl font-bold text-amber-300">
                        {initials || "U"}
                      </div>
                    )}
                  </div>

                  <label
                    htmlFor="profile-picture"
                    title="Upload new photo"
                    className={`absolute -right-2 -bottom-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-zinc-950 bg-amber-400 text-zinc-950 shadow-lg transition hover:bg-amber-300 ${
                      profileImageLoading ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    {profileImageLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </label>
                </div>

                {profilePic && (
                  <button
                    type="button"
                    onClick={handleProfileImageRemove}
                    disabled={profileImageLoading}
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 text-xs font-medium text-red-300 transition hover:border-red-500/40 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove
                  </button>
                )}

                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageUpload}
                  disabled={profileImageLoading}
                  className="hidden"
                />
              </div>

              {/* Live Preview Metadata */}
              <div className="mt-5 space-y-1">
                <h1 className="truncate text-xl font-bold tracking-tight text-white">
                  {displayName}
                </h1>
                {username && (
                  <p className="text-xs font-medium text-amber-400">
                    @{username}
                  </p>
                )}
              </div>

              {bio ? (
                <p className="mt-3 line-clamp-4 text-xs leading-relaxed text-zinc-400">
                  {bio}
                </p>
              ) : (
                <p className="mt-3 text-xs italic text-zinc-500">
                  No bio added yet. Share your favorite genres or directors on
                  the right.
                </p>
              )}

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-zinc-400">
                {email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {selectedCountryName && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                    <span>{selectedCountryName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Cinema Library Links */}
            <div className="rounded-3xl border border-white/10 bg-zinc-900/40 p-4">
              <p className="px-2 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase">
                Your Cinema Activity
              </p>
              <div className="mt-2 space-y-1">
                <Link
                  href="/bookmarks"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Bookmark className="h-4 w-4 text-amber-400" />
                    Watchlist & Bookmarks
                  </span>
                  <span className="text-zinc-500">→</span>
                </Link>
                <Link
                  href="/watched"
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.04] hover:text-white"
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Eye className="h-4 w-4 text-amber-400" />
                    Watched History
                  </span>
                  <span className="text-zinc-500">→</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* RIGHT COLUMN: Modular Form Cards */}
          <form
            onSubmit={handleSubmit}
            className="relative z-10 space-y-6 lg:-mt-14 lg:col-span-8"
          >
            {/* Card 1: Public Identity & Bio */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
              <div className="mb-5 flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Public Identity
                  </h2>
                  <p className="text-xs text-zinc-400">
                    How your name, handle, and bio appear across reviews and
                    lists.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  id="firstName"
                  label="First name"
                  value={firstName}
                  autoComplete="given-name"
                  onChange={(e) => setFirstName(e.target.value)}
                />

                <ProfileField
                  id="lastName"
                  label="Last name"
                  value={lastName}
                  autoComplete="family-name"
                  onChange={(e) => setLastName(e.target.value)}
                />

                <div className="sm:col-span-2">
                  <ProfileField
                    id="username"
                    label="Username"
                    value={username}
                    autoComplete="username"
                    // icon={<AtSign className="h-4 w-4 text-zinc-500" />}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                {/* Bio */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="bio"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300"
                    >
                      <FileText className="h-3.5 w-3.5 text-zinc-500" />
                      About & Taste
                    </label>
                    <span
                      className={`text-xs font-medium ${
                        bio.length > MAX_BIO_LENGTH
                          ? "text-red-400"
                          : "text-zinc-500"
                      }`}
                    >
                      {bio.length}/{MAX_BIO_LENGTH}
                    </span>
                  </div>

                  <textarea
                    id="bio"
                    name="bio"
                    rows={3}
                    maxLength={MAX_BIO_LENGTH}
                    value={bio}
                    placeholder="Sci-fi junkie, A24 fan, rewatching Breaking Bad every winter..."
                    onChange={(e) => setBio(e.target.value)}
                    className="rounded-xl border border-white/10 bg-zinc-950/90 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition hover:border-white/20 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>
            </section>

            {/* Card 2: Contact & Region */}
            <section className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 sm:p-7">
              <div className="mb-5 flex items-center gap-2.5 border-b border-white/10 pb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Contact & Regional Preferences
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Private account details and default discovery region.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileField
                  id="email"
                  label="Email address"
                  type="email"
                  value={email}
                  autoComplete="email"
                  inputMode="email"
                  icon={<Mail className="h-4 w-4 text-zinc-500" />}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <ProfileField
                  id="phone"
                  label="Phone number"
                  type="tel"
                  value={phone}
                  autoComplete="tel"
                  inputMode="tel"
                  icon={<Phone className="h-4 w-4 text-zinc-500" />}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <ProfileField
                  id="dateOfBirth"
                  label="Date of birth"
                  type="date"
                  value={dateOfBirth}
                  icon={<Calendar className="h-4 w-4 text-zinc-500" />}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="country"
                    className="text-xs font-semibold text-zinc-300"
                  >
                    Country / Region
                  </label>
                  <div className="relative">
                    <Globe className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <select
                      id="country"
                      name="country"
                      value={country}
                      disabled={countriesLoading}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-4 pl-10 text-sm text-zinc-100 outline-none transition hover:border-white/20 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 disabled:opacity-60"
                    >
                      <option value="">
                        {countriesLoading
                          ? "Loading countries..."
                          : "Select a country"}
                      </option>
                      {countries.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.name} ({item.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Bottom Action Strip */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/70 px-5 py-4 backdrop-blur-md">
              <p className="text-xs text-zinc-400">
                Changes apply immediately to your profile.
              </p>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-5 text-xs font-semibold text-zinc-950 shadow-lg shadow-amber-500/15 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Full-Size Avatar Lightbox */}
      {showProfileImage && profilePic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <button
            type="button"
            aria-label="Close profile picture"
            onClick={() => setShowProfileImage(false)}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative max-h-[90vh] max-w-[90vw] rounded-3xl border border-white/15 bg-zinc-900/95 p-3 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowProfileImage(false)}
              aria-label="Close"
              className="absolute top-4 right-4 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-zinc-950/90 text-zinc-200 shadow-lg transition hover:border-amber-400/50 hover:text-amber-300"
            >
              <X className="h-4 w-4" />
            </button>

            <img
              src={profileImageUrl}
              alt={displayName}
              className="max-h-[82vh] max-w-[85vw] rounded-2xl object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

type ProfileFieldProps = {
  id: string;
  label: string;
  type?: string;
  value: string;
  icon?: React.ReactNode;
  autoComplete?: string;
  inputMode?:
    | "none"
    | "text"
    | "tel"
    | "url"
    | "email"
    | "numeric"
    | "decimal"
    | "search";
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

function ProfileField({
  id,
  label,
  type = "text",
  value,
  icon,
  autoComplete,
  inputMode,
  onChange,
}: ProfileFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-zinc-300">
        {label}
      </label>

      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2">
            {icon}
          </span>
        )}
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={onChange}
          className={`h-11 w-full rounded-xl border border-white/10 bg-zinc-950/90 pr-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition hover:border-white/20 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 [color-scheme:dark] ${
            icon ? "pl-10" : "pl-4"
          }`}
        />
      </div>
    </div>
  );
}