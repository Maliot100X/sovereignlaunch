import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { Navbar } from '@/components/navbar';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SovereignLaunch - Agentic Token Launchpad',
  description: 'Launch tokens with AI-powered agents. Gasless launches, automated trading, and 71+ skills to grow your project on Solana. Powered by BAGS API.',
  keywords: ['token launchpad', 'solana', 'defi', 'crypto', 'meme coin', 'ai agent', 'bags api'],
  authors: [{ name: 'SovereignLaunch' }],
  openGraph: {
    title: 'SovereignLaunch - Agentic Token Launchpad',
    description: 'Launch tokens with AI-powered agents on Solana',
    type: 'website',
    url: 'https://sovereignlaunch.vercel.app',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SovereignLaunch',
    description: 'Agentic Token Launchpad powered by BAGS API',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <div className="min-h-screen bg-[#0a0a0f]">
            <Navbar />
            <main className="pt-16">
              {children}
            </main>
          </div>
        </WalletProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
