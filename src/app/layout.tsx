import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Inter, JetBrains_Mono, Yatra_One } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import Reveal from "@/components/Reveal";
import ServiceWorker from "@/components/ServiceWorker";
import { auth } from "@/lib/auth";
import Chrome from "@/components/Chrome";
import { unlockedForSetup } from "@/lib/people";

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
  title: "manno weds momo",
  description: "paperwork pending. everything else already happened.",
  manifest: "/manifest.webmanifest",
  robots: { index: false, follow: false, nocache: true },
  // no OG image with real photos, ever (PRD §10)
  openGraph: { title: "manno weds momo", images: [] },
  appleWebApp: { capable: true, title: "manno weds momo", statusBarStyle: "default" },
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
        >
          {children}
        </Chrome>
      </body>
    </html>
  );
}
