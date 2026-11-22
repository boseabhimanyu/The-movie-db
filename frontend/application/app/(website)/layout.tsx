import DynamicMenus from "@/components/menus/DynamicMenus";
import { fetchMenus } from "@/components/menus/menu-api";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialMenus, user] = await Promise.all([
    fetchMenus(),
    getCurrentUser(),
  ]);

  return (
    <DynamicMenus initialMenus={initialMenus} initialUser={user}>
      {children}
    </DynamicMenus>
  );
}