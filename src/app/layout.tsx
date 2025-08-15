import { Metadata } from "next";

// Metadata must be in a server component
export const metadata: Metadata = {
  title: "TREKA - Asset Management System",
  description: "Streamline your asset and component maintenance with our powerful management system",
};

// Client components must be in a separate file
import ClientLayout from "@/components/ClientLayout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ClientLayout>{children}</ClientLayout>;
}
