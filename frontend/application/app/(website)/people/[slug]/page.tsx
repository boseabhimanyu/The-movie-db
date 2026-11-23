import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import axios from "axios";
import api from "@/lib/api";
import type { PersonDetailResponse } from "../types";
import PersonDetailClient from "./PersonDetailClient";

type PageParams = Promise<{ slug: string }>;

const fetchPerson = cache(async (slug: string): Promise<{
  data: PersonDetailResponse | null;
  isNotFound: boolean;
  error: string | null;
}> => {
  try {
    const res = await api.get<PersonDetailResponse>(
      `/people/${encodeURIComponent(slug)}`
    );
    return { data: res.data, isNotFound: false, error: null };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return { data: null, isNotFound: true, error: null };
    }
    const msg =
      axios.isAxiosError(err) && err.response?.data?.error
        ? err.response.data.error
        : "Failed to load person profile.";
    return { data: null, isNotFound: false, error: msg };
  }
});

export async function generateMetadata({
  params,
}: {
  params: PageParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const { data } = await fetchPerson(slug);

  const person = data?.person;
  if (!person?.name) {
    return { title: "Person Not Found" };
  }

  const description =
    person.biography?.trim().slice(0, 160) ||
    `Explore movies, TV shows, and credits for ${person.name}.`;
  const headshot = person.images?.headshot;

  return {
    title: person.name,
    description,
    alternates: {
      canonical: `/people/${person.ids?.slug || slug}`,
    },
    openGraph: {
      title: person.name,
      description,
      type: "profile",
      ...(headshot ? { images: [{ url: headshot, alt: person.name }] } : {}),
    },
    twitter: {
      card: headshot ? "summary_large_image" : "summary",
      title: person.name,
      description,
      ...(headshot ? { images: [headshot] } : {}),
    },
  };
}

export default async function PersonDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const { slug } = await params;
  const { data, isNotFound, error } = await fetchPerson(slug);

  if (isNotFound) {
    notFound();
  }

  const person = data?.person;
  const jsonLd = person
    ? {
        "@context": "https://schema.org",
        "@type": "Person",
        name: person.name,
        ...(person.biography ? { description: person.biography } : {}),
        ...(person.images?.headshot ? { image: person.images.headshot } : {}),
        ...(person.birthday ? { birthDate: person.birthday } : {}),
        ...(person.death ? { deathDate: person.death } : {}),
        ...(person.birthplace ? { birthPlace: person.birthplace } : {}),
        ...(person.knownForDepartments?.length
          ? { jobTitle: person.knownForDepartments }
          : {}),
        ...(person.homepage ? { url: person.homepage } : {}),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PersonDetailClient
        initialData={data}
        notFound={false}
        error={error}
      />
    </>
  );
}