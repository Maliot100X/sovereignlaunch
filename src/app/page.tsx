import { Hero } from '@/components/hero';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SovereignLaunch - Agentic Token Launchpad',
  description: 'Launch tokens with AI-powered agents. Gasless launches, automated trading, and 71+ skills to grow your project on Solana.',
};

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
    </div>
  );
}
