"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { Hotel, Notification } from "../lib/types";
import {
  FileText,
  Truck,
  Hotel as HotelIcon,
  CreditCard,
  LogOut,
  Droplet,
  Bell,
  User as UserIcon,
  Menu,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [operatorName, setOperatorName] = useState<string>("Hotel Operator");
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    api.logout();
    router.replace("/login");
  };

  const navItems = [
    { name: "My Profile", href: "/profile", icon: HotelIcon },
    { name: "Pickup Requests", href: "/requests", icon: FileText },
    { name: "My Trips", href: "/trips", icon: Truck },
    { name: "Invoices", href: "/payments", icon: CreditCard },
  ];

  // Fetch hotel info & notifications
  useEffect(() => {
    async function loadShellData() {
      try {
        const me = await api.me();
        if (me) {
          setOperatorName(me.role.toUpperCase());
          if (me.hotel_id) {
            const h = await api.getMyHotel(me.hotel_id);
            setHotel(h);
          }
        }
      } catch (err) {
        console.error("Shell initialization failed:", err);
      }
    }

    async function loadNotifications() {
      try {
        const notes = await api.listNotifications(true); // unread only
        setUnreadNotifications(notes);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    }

    loadShellData();
    loadNotifications();

    // Poll notifications every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => setSidebarOpen(false), [pathname]);

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {sidebarOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar */}
      <aside className={`w-64 bg-slate-950 text-white flex flex-col fixed inset-y-0 left-0 z-40 border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-850 gap-2.5 bg-slate-950">
          <div className="p-1.5 rounded-md bg-indigo-600 text-white">
            <Droplet className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white leading-none">Squas Hotel</h1>
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/40 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-md bg-slate-700 flex items-center justify-center font-bold text-slate-200">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{hotel?.hotel_name || "Hotel Operator"}</p>
              <p className="text-xs text-slate-400 truncate">{operatorName}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-red-400 hover:text-white hover:bg-red-900/40 border border-red-900/30 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 lg:hidden"><Menu className="h-5 w-5" /></button>
            <h2 className="text-base font-semibold text-slate-800">
              {navItems.find((item) => pathname.startsWith(item.href))?.name || "Hotel Portal"}
            </h2>
            {hotel && (
              <span className={`text-xs px-2 py-1 rounded-md font-medium border ${
                hotel.status === "active"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}>
                {hotel.status.toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0 flex items-center gap-3 sm:gap-6">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 focus:outline-none cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-600 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-[min(20rem,calc(100vw-2rem))] bg-white border border-gray-150 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                  <div className="p-3.5 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-800">Notifications</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {unreadNotifications.length} Unread
                    </span>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                    {unreadNotifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic">No new notifications</div>
                    ) : (
                      unreadNotifications.map((note) => (
                        <div key={note.id} className="p-3.5 space-y-1 hover:bg-slate-50 transition-colors">
                          <h6 className="text-xs font-extrabold text-slate-900 leading-normal">{note.title}</h6>
                          <p className="text-[10px] text-slate-500 leading-relaxed">{note.body}</p>
                          <span className="text-[9px] text-slate-400 font-medium block">
                            {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:block h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:block text-xs font-medium text-slate-500">Connected</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 overflow-x-hidden overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
