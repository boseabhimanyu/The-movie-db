export type User = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  profilePic?: string | null;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  dateOfBirth?: string | null;
  twoFactorEnabled: boolean;
  country?: string;
  bio?: string;
};

export type PageVisibility = "public" | "registered";

export type Page = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  slug: string;
  visibility: PageVisibility;
  isHomepage: boolean;
  createdAt: string;
  updatedAt: string;
  css?: string;
};

export type PagesPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PagesResponse = {
  pages: Page[];
  pagination: PagesPagination;
};