import { SidebarLayout } from "@/components/SidebarLayout";
import { GraphTreeProvider } from "@/lib/graph-tree-context";
import { QueryProvider } from "@/lib/query-context";
import type { Metadata } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import "./globals.css";

const customSans = Google_Sans({
  variable: "--font-custom-sans",
  subsets: ["latin"],
});

const customMono = Google_Sans_Code({
  variable: "--font-custom-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConceptBranch KTE",
  description:
    "ConceptBranch KTE is a knowledge tree explorer that uses AI to generate a tree of knowledge based on a given topic.",
  icons: {
    icon: "/linux-logo-fill.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${customSans.variable} ${customMono.variable} antialiased`}
      >
        <QueryProvider>
          <GraphTreeProvider>
            <SidebarLayout>{children}</SidebarLayout>
          </GraphTreeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
