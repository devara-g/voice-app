import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { VoiceProvider } from "@/contexts/VoiceContext";
import GlobalVoiceChat from "@/components/GlobalVoiceChat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SiHALO — Voice Chat",
  description: "Voice chat application like Discord",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <VoiceProvider>
          {children}
          {/* Global voice — persists across all page navigations */}
          <GlobalVoiceChat />
        </VoiceProvider>
      </body>
    </html>
  );
}