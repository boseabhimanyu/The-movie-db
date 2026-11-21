import DynamicMenus from "@/components/menus/DynamicMenus";
import { fetchMenus } from "@/components/menus/menu-api";
import AuthFloatingWidget from "@/components/AuthFloatingWidget";

export const dynamic = "force-dynamic";

export default async function WebsiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialMenus = await fetchMenus();

  return (
    <DynamicMenus initialMenus={initialMenus}>
      {children}
      <AuthFloatingWidget />
    </DynamicMenus>
  );
}