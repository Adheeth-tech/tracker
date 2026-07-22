"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { Notification } from "../lib/types";
import {
  FileText,
  Clock,
  LogOut,
  Droplet,
  Bell,
  User as UserIcon,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [driverName, setDriverName] = useState<string>("Tanker Driver");
  const [operatorRole, setOperatorRole] = useState<string>("DRIVER");
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    api.logout();
    router.replace("/login");
  };

  const navItems = [
    { name: "Active Jobs", href: "/jobs", icon: FileText },
    { name: "Job History", href: "/history", icon: Clock },
    { name: "My Profile", href: "/profile", icon: UserIcon },
  ];

  // Fetch driver info & notifications
  useEffect(() => {
    async function loadShellData() {
      try {
        const me = await api.me();
        if (me) {
          setOperatorRole(me.role.toUpperCase());
          setDriverName(me.name || (me.role === "driver" ? `Driver #${me.driver_id}` : "System User"));
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

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed inset-y-0 left-0 z-30 shadow-xl border-r border-slate-800">
        {/* Brand Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-850 gap-2.5 bg-slate-950">
          <div className="p-1.5 rounded-lg bg-indigo-650 text-white shadow-md">
            <Droplet className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-md font-bold tracking-tight text-white leading-none">Squas Driver</h1>
            <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Tanker Hub</span>
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
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-150 ${
                  isActive
                    ? "bg-indigo-650 text-white shadow-md shadow-indigo-600/20"
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
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-slate-200">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-200 truncate">{driverName}</p>
              <p className="text-[10px] text-slate-400 truncate">{operatorRole}</p>
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
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-gray-150 flex items-center justify-between px-8 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">
              {navItems.find((item) => pathname.startsWith(item.href))?.name || "Driver Portal"}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600 focus:outline-none cursor-pointer"
              >
                <Bell className="h-4.5 w-4.5" />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-indigo-650 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-85 bg-white border border-gray-150 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100">
                  <div className="p-3.5 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800">Telemetry Notifications</span>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                      {unreadNotifications.length} New
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
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-bold text-gray-500">Live Telematics</span>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
