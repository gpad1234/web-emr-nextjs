import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/components/providers";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MobileEMR — Clinical Workspace",
  description: "Clinician-first electronic medical records",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 md:ml-64 min-h-screen pt-14 md:pt-0">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
