import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Providers } from "@/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "GitPulse — GitHub Knowledge Assistant",
    template: "%s | GitPulse",
  },
  description:
    "Chat with any GitHub repository. Ask questions, explore architecture, and understand codebases using AI.",
  keywords: [
    "GitHub",
    "AI",
    "code assistant",
    "repository",
    "chat",
    "knowledge base",
  ],
  authors: [{ name: "GitPulse" }],
  openGraph: {
    title: "GitPulse — GitHub Knowledge Assistant",
    description: "Chat with any GitHub repository using AI.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
