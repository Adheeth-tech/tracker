import React from "react";
import "./globals.css";
import { ToastProvider } from "../components/Toast";

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
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
