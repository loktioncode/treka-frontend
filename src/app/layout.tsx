import { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

// Client components must be in a separate file
import ClientLayout from "@/components/ClientLayout";

// Viewport configuration (separate from metadata in Next.js 14+)
export const viewport = "width=device-width, initial-scale=1";

// Metadata must be in a server component
export const metadata: Metadata = {
  title: "TREKAMAN - Fleet management System",
  description: "Streamline your asset and component maintenance with our powerful management system",
  other: {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "referrer": "strict-origin-when-cross-origin",
    "robots": "noindex, nofollow",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
