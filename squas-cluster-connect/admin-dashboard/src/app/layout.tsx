import React from "react";
import "./globals.css";
import { ToastProvider } from "../components/Toast";
import AppFrame from "../components/AppFrame";

export const metadata = {
  title: "Squas Cluster Connect Admin",
  description: "Wastewater tracking & fleet dispatch dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 text-gray-900">
        <ToastProvider><AppFrame>{children}</AppFrame></ToastProvider>
      </body>
    </html>
  );
}
