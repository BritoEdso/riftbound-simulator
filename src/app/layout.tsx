import type { Metadata } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Condensed display face for headings and the game HUD.
const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Riftbound Simulator",
  description: "Learn Riftbound one Legend at a time, through trials you solve turn by turn.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable}`}>
      <body>
        {children}
        {/* Required by Riot's "Legal Jibber Jabber" policy — see CLAUDE.md's
            Card data section. */}
        <footer style={{ marginTop: "auto", padding: "16px", fontSize: "12px", color: "var(--rift-muted)", textAlign: "center" }}>
          Riftbound Simulator was created under Riot Games&apos; &quot;Legal Jibber Jabber&quot; policy using assets owned
          by Riot Games. Riot Games does not endorse or sponsor this project.
        </footer>
      </body>
    </html>
  );
}
