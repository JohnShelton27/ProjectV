import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageTracker from "@/components/PageTracker";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    title: {
      default: settings.siteName,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.siteDescription,
    openGraph: {
      title: settings.siteName,
      description: settings.siteDescription,
      type: "website",
      siteName: settings.siteName,
    },
    twitter: {
      card: "summary",
      title: settings.siteName,
      description: settings.siteDescription,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col">
        <Header />
        <PageTracker />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
