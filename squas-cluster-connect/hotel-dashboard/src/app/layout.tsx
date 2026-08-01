import React from "react";
import "./globals.css";
import { ToastProvider } from "../components/Toast";

export const metadata = {
  title: "Squas Connect — Hotel Hub",
  description: "De-centralized Wastewater Tracking & Billing Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
