"use client";

import axios from "axios";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

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
  if (!value) {
    return "";
  }

  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  );

  if (!match) {
    return "";
  }

  const [, year, month, day] = match;

  return `${day}-${month}-${year}`;
}

function formatDateForInput(value?: string | null) {
  if (!value) {
    return "";
  }

  // ISO date/timestamp: 1985-08-15T00:00:00Z
  const isoMatch = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T/,
  );

  if (isoMatch) {
    const [, year, month, day] = isoMatch;

    return `${year}-${month}-${day}`;
  }

  // DD-MM-YYYY: 15-08-1985
  const dmyMatch = value.match(
    /^(\d{2})-(\d{2})-(\d{4})$/,
  );

  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;

    return `${year}-${month}-${day}`;
  }

  return "";
}

export default function ProfileFormRoot({
  user,
}: ProfileFormProps) {
  const { showNotification } = useNotification();

  const [firstName, setFirstName] = useState(
    user.firstName ?? "",
  );

  const [lastName, setLastName] = useState(
    user.lastName ?? "",
  );

  const [username, setUsername] = useState(
    user.username ?? "",
  );

  const [email, setEmail] = useState(
    user.email ?? "",
  );

  const [phone, setPhone] = useState(
    user.phone ?? "",
  );

  const [dateOfBirth, setDateOfBirth] = useState(
    formatDateForInput(user.dateOfBirth),
  );

  const [country, setCountry] = useState(
    user.country ?? "",
  );

  const [bio, setBio] = useState(
    user.bio ?? "",
  );

  const [countries, setCountries] = useState<
    CountryOption[]
  >([]);

  const [countriesLoading, setCountriesLoading] =
    useState(false);

  const [profilePic, setProfilePic] = useState(
    user.profilePic ?? "",
  );

  const [profileImageLoading, setProfileImageLoading] =
    useState(false);

  const [showProfileImage, setShowProfileImage] =
    useState(false);

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
        if (active) {
          setCountriesLoading(false);
        }
      }
    }

    fetchCountries();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);

    try {
      const apiDateOfBirth =
        formatDateForApi(dateOfBirth);

      const response = await api.patch(
        "/auth/me",
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: apiDateOfBirth,
          country: country.trim(),
          bio: bio.trim(),
        },
      );

      if (response.data?.user) {
        setBio(response.data.user.bio ?? "");
        setCountry(response.data.user.country ?? "");
      }

      showNotification(
        response.data?.message ??
          "Profile updated successfully.",
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
        showNotification(
          "Unable to connect to the server.",
          "error",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleProfileImageUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();

    formData.append("profile_pic", file);

    setProfileImageLoading(true);

    try {
      const response = await api.patch(
        "/auth/me/image",
        formData,
      );

      showNotification(
        response.data?.message ??
          "Profile picture updated successfully.",
        "success",
      );

      // Refresh to load the newly saved profile picture.
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
        showNotification(
          "Unable to connect to the server.",
          "error",
        );
      }
    } finally {
      setProfileImageLoading(false);

      // Allow selecting the same file again.
      event.target.value = "";
    }
  }

  async function handleProfileImageRemove() {
    if (!profilePic) {
      return;
    }

    setProfileImageLoading(true);

    try {
      const response = await api.delete("/auth/me/image");

      setProfilePic("");
      setShowProfileImage(false);

      showNotification(
        response.data?.message ??
          "Profile picture removed successfully.",
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
        showNotification(
          "Unable to connect to the server.",
          "error",
        );
      }
    } finally {
      setProfileImageLoading(false);
    }
  }

  const profileImageUrl = profilePic
    ? `${process.env.NEXT_PUBLIC_API_URL?.replace(
        "/api/v1",
        "",
      )}/${profilePic}`
    : "";

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border p-4 
        shadow-[0_8px_30px_rgba(23,60,121,0.08)] 
        backdrop-blur-2xl sm:p-5 lg:p-6"
        style={{
          borderColor: "var(--menu-glass-border)",
          color: "var(--menu-text)",
        }}
      >
        {/* Profile Picture */}

        <section className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div
              className="h-24 w-24 shrink-0 overflow-hidden rounded-full border bg-white/60 shadow-[0_8px_24px_rgba(23,60,121,0.10)]"
              style={{
                borderColor: "var(--menu-glass-border)",
              }}
            >
              {profilePic ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowProfileImage(true)
                  }
                  className="block h-full w-full cursor-zoom-in"
                  aria-label="View profile picture"
                >
                  <img
                    src={profileImageUrl}
                    alt={`${firstName} ${lastName}`}
                    className="h-full w-full object-cover transition-transform duration-200 hover:scale-105"
                  />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-semibold">
                  {firstName.charAt(0)}
                  {lastName.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <h2
                className="text-base font-semibold"
                style={{
                  color: "var(--menu-text)",
                }}
              >
                Profile picture
              </h2>

              <p
                className="mt-1 text-sm"
                style={{
                  color: "var(--menu-muted)",
                }}
              >
                Upload a new profile picture.
              </p>
<div className="mt-3 flex flex-wrap items-center gap-2.5">
  <label
    htmlFor="profile-picture"
    className={`inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-4 shadow-sm transition-colors hover:brightness-95 ${
      profileImageLoading
        ? "pointer-events-none opacity-60"
        : ""
    }`}
    style={{
      backgroundColor: "var(--menu-glass)",
      borderColor: "var(--menu-glass-border)",
      color: "var(--menu-text)",
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "14px",
    }}
  >
    {profileImageLoading
      ? "Updating..."
      : "Change photo"}
  </label>

  {profilePic && (
    <button
      type="button"
      onClick={handleProfileImageRemove}
      disabled={profileImageLoading}
      className="inline-flex h-10 cursor-pointer items-center justify-center rounded-xl border px-4 shadow-sm transition-colors hover:brightness-95 disabled:pointer-events-none disabled:opacity-60"
      style={{
        backgroundColor: "var(--menu-glass)",
        borderColor: "var(--menu-glass-border)",
        color: "var(--menu-text)",
        fontSize: "14px",
        fontWeight: 500,
        lineHeight: "14px",
      }}
    >
      Remove photo
    </button>
  )}
</div>
              <input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleProfileImageUpload}
                disabled={profileImageLoading}
                className="hidden"
              />
            </div>
          </div>
        </section>

        <div
          className="mb-6 h-px"
          style={{
            backgroundColor: "var(--menu-glass-border)",
          }}
        />

        {/* Personal Information */}

        <section>
          <div className="mb-5">
            <h2
              className="text-base font-semibold"
              style={{
                color: "var(--menu-text)",
              }}
            >
              Personal information
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProfileField
              id="firstName"
              label="First name"
              value={firstName}
              autoComplete="given-name"
              onChange={(event) =>
                setFirstName(event.target.value)
              }
            />

            <ProfileField
              id="lastName"
              label="Last name"
              value={lastName}
              autoComplete="family-name"
              onChange={(event) =>
                setLastName(event.target.value)
              }
            />

            <ProfileField
              id="username"
              label="Username"
              value={username}
              autoComplete="username"
              onChange={(event) =>
                setUsername(event.target.value)
              }
            />

            <ProfileField
              id="phone"
              label="Phone"
              type="tel"
              value={phone}
              autoComplete="tel"
              inputMode="tel"
              onChange={(event) =>
                setPhone(event.target.value)
              }
            />

            <ProfileField
              id="email"
              label="Email"
              type="email"
              value={email}
              autoComplete="email"
              inputMode="email"
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />

            <ProfileField
              id="dateOfBirth"
              label="Date of birth"
              type="date"
              value={dateOfBirth}
              onChange={(event) =>
                setDateOfBirth(event.target.value)
              }
            />

            {/* Country Select */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label
                htmlFor="country"
                className="text-sm font-medium"
                style={{
                  color: "var(--menu-text)",
                }}
              >
                Country{" "}
                <span
                  className="text-xs font-normal"
                  style={{ color: "var(--menu-muted)" }}
                >
                  (optional)
                </span>
              </label>

              <select
                id="country"
                name="country"
                value={country}
                disabled={countriesLoading}
                onChange={(event) =>
                  setCountry(event.target.value)
                }
                className="h-11 rounded-xl border px-4 text-sm shadow-[0_4px_14px_rgba(23,60,121,0.07)] outline-none backdrop-blur-xl transition hover:bg-white/70 focus:border-blue-300 focus:bg-white/80 focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                style={{
                  backgroundColor: "var(--menu-glass)",
                  borderColor: "var(--menu-glass-border)",
                  color: "var(--menu-text)",
                }}
              >
                <option value="">
                  {countriesLoading
                    ? "Loading countries..."
                    : "Select a country"}
                </option>
                {countries.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                  >
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Bio Textarea */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="bio"
                  className="text-sm font-medium"
                  style={{
                    color: "var(--menu-text)",
                  }}
                >
                  Bio{" "}
                  <span
                    className="text-xs font-normal"
                    style={{ color: "var(--menu-muted)" }}
                  >
                    (optional)
                  </span>
                </label>

                <span
                  className="text-xs"
                  style={{
                    color:
                      bio.length > MAX_BIO_LENGTH
                        ? "#dc2626"
                        : "var(--menu-muted)",
                  }}
                >
                  {bio.length}/{MAX_BIO_LENGTH}
                </span>
              </div>

              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={MAX_BIO_LENGTH}
                value={bio}
                placeholder="Tell others a bit about your favorite genres, directors, or shows..."
                onChange={(event) =>
                  setBio(event.target.value)
                }
                className="rounded-xl border px-4 py-3 text-sm shadow-[0_4px_14px_rgba(23,60,121,0.07)] outline-none backdrop-blur-xl transition hover:bg-white/70 focus:border-blue-300 focus:bg-white/80 focus:ring-2 focus:ring-blue-200"
                style={{
                  backgroundColor: "var(--menu-glass)",
                  borderColor: "var(--menu-glass-border)",
                  color: "var(--menu-text)",
                }}
              />
            </div>
          </div>
        </section>

        {/* Actions */}

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="h-11 rounded-xl px-5 text-sm font-medium text-white shadow-lg shadow-blue-900/15 transition-colors hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              backgroundColor: "var(--menu-blue)",
            }}
          >
            {loading
              ? "Saving..."
              : "Save changes"}
          </button>
        </div>
      </form>

      {/* Profile Image Preview */}

      {showProfileImage && profilePic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close profile picture"
            onClick={() =>
              setShowProfileImage(false)
            }
            className="absolute inset-0 cursor-default"
          />

          <div
            className="relative max-h-[90vh] max-w-[90vw] rounded-3xl border p-3 shadow-[0_24px_70px_rgba(23,60,121,0.22)] backdrop-blur-2xl"
            style={{
              backgroundColor: "var(--menu-glass)",
              borderColor: "var(--menu-glass-border)",
            }}
          >
            <button
              type="button"
              onClick={() =>
                setShowProfileImage(false)
              }
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-white/80 text-lg shadow-sm backdrop-blur-xl transition hover:bg-white"
              style={{
                borderColor: "var(--menu-glass-border)",
                color: "var(--menu-text)",
              }}
            >
              ×
            </button>

            <img
              src={profileImageUrl}
              alt={`${firstName} ${lastName}`}
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
  onChange: (
    event: ChangeEvent<HTMLInputElement>,
  ) => void;
};

function ProfileField({
  id,
  label,
  type = "text",
  value,
  autoComplete,
  inputMode,
  onChange,
}: ProfileFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium"
        style={{
          color: "var(--menu-text)",
        }}
      >
        {label}
      </label>

      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        inputMode={inputMode}
        onChange={onChange}
        className="h-11 rounded-xl border px-4 text-sm shadow-[0_4px_14px_rgba(23,60,121,0.07)] outline-none backdrop-blur-xl transition hover:bg-white/70 focus:border-blue-300 focus:bg-white/80 focus:ring-2 focus:ring-blue-200"
        style={{
          backgroundColor: "var(--menu-glass)",
          borderColor: "var(--menu-glass-border)",
          color: "var(--menu-text)",
        }}
      />
    </div>
  );
}
