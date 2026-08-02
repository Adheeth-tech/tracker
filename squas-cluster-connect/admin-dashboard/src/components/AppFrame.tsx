"use client";

import React from "react";
import { usePathname } from "next/navigation";
import AppShell from "./AppShell";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login" || pathname === "/";

  return isPublicRoute ? <>{children}</> : <AppShell>{children}</AppShell>;
}
