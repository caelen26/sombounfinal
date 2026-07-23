import type { Metadata } from "next";
import { Cormorant_Garamond, Fraunces, Jost } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

// Smooth, rounded modern serif for product names/prices + treatment stat values.
// Variable font: opsz for optical sizing, SOFT to round the terminals, WONK off.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jost",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sombounjunestudio.com"),
  title: "Somboun June — Premium Skincare",
  description: "Premium skincare and laser treatments by Somboun June, Winnipeg.",
  applicationName: "Somboun June Studio",
  openGraph: {
    type: "website",
    siteName: "Somboun June Studio",
    title: "Somboun June — Premium Skincare",
    description: "Premium skincare and laser treatments by Somboun June, Winnipeg.",
    url: "https://sombounjunestudio.com",
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${fraunces.variable} ${jost.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Somboun June Studio",
              url: "https://sombounjunestudio.com",
            }),
          }}
        />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
