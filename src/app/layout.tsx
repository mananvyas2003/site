import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Yatra_One } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Reveal from "@/components/Reveal";
import ServiceWorker from "@/components/ServiceWorker";
import { auth } from "@/lib/auth";
import Chrome from "@/components/Chrome";
import { unlockedForSetup } from "@/lib/people";
import { getUnreadInboxCount } from "@/lib/inbox";
import { COPY, SITE_TITLE } from "@/lib/copy";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const yatraOne = Yatra_One({
  subsets: ["devanagari", "latin"],
  weight: "400",
  variable: "--font-yatra-one",
  display: "swap",
});

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: COPY.heroSub,
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false, nocache: true },
  // no OG image with real photos, ever (PRD §10)
  openGraph: { title: SITE_TITLE, images: [] },
  appleWebApp: { capable: true, title: SITE_TITLE, statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#FBF6EC",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const signedIn = Boolean(session?.user?.id || session?.user?.email);
  const unreadInbox =
    signedIn && session?.user?.id ? await getUnreadInboxCount(session.user.id) : 0;

  return (
    <html
      lang="en"
      className={`${instrumentSerif.variable} ${inter.variable} ${jetbrainsMono.variable} ${yatraOne.variable}`}
    >
      <body>
        <SmoothScroll />
        <Reveal />
        <ServiceWorker />
        <Chrome
          signedIn={signedIn}
          handle={session?.user?.handle ?? null}
          accent={session?.user?.accent ?? null}
          unlocked={unlockedForSetup()}
          unreadInbox={unreadInbox}
        >
          {children}
        </Chrome>
      </body>
    </html>
  );
}
