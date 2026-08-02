"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import {
  LayoutDashboard,
  FileText,
  Truck,
  Users,
  Hotel,
  CreditCard,
  MapPin,
  LogOut,
  Droplet,
  Menu,
  X,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
    router.replace("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Requests", href: "/requests", icon: FileText },
    { name: "Trips", href: "/trips", icon: Truck },
    { name: "Fleet", href: "/fleet", icon: Users },
    { name: "Hotels", href: "/hotels", icon: Hotel },
    { name: "Payments", href: "/payments", icon: CreditCard },
    { name: "Live Tracking", href: "/tracking", icon: MapPin },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      {sidebarOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`w-64 bg-slate-950 text-white flex flex-col fixed inset-y-0 left-0 z-40 border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-850 gap-2.5 bg-slate-950">
          <div className="p-1.5 rounded-md bg-indigo-600 text-white">
            <Droplet className="h-6 w-6 text-indigo-400" />
          </div>
          <button
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto p-1 text-slate-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white leading-none">Squas Connect</h1>
            <span className="text-xs text-slate-400 font-medium">Operations</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / User Info */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-md bg-slate-700 flex items-center justify-center font-bold text-slate-200">
              A
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">Administrator</p>
              <p className="text-xs text-slate-400 truncate">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-red-300 hover:text-white hover:bg-red-900/40 border border-red-900/30 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-slate-900 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-base font-semibold text-slate-800">
              {navItems.find((item) => pathname.startsWith(item.href))?.name || "System"}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-medium text-slate-500">Connected</span>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-5 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
