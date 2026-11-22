"use client";

import type { ReactNode } from "react";
import StorefrontNavbar from "@/app/(website)/components/menus/StorefrontNavbar";
import type { User } from "@/lib/types";
import MenuHeader from "./MenuHeader";
import MenuFooter from "./MenuFooter";
import type { Menu } from "./menu-types";

type InitialMenus = {
  top: Menu | null;
  left: Menu | null;
  bottom: Menu | null;
};

type DynamicMenusProps = {
  children: ReactNode;
  initialMenus: InitialMenus;
  initialUser?: User | null;
};

export default function DynamicMenus({
  children,
  initialMenus,
  initialUser = null,
}: DynamicMenusProps) {
  const { top, bottom } = initialMenus;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      <StorefrontNavbar initialUser={initialUser} />

      {top && top.status && <MenuHeader menu={top} />}

      <main className="flex-1">{children}</main>

      {bottom ? (
        <MenuFooter menu={bottom} />
      ) : (
        <MenuFooter
          menu={{
            name: "Footer",
            location: "bottom",
            status: false,
            items: [],
          }}
        />
      )}
    </div>
  );
}