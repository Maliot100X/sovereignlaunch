'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Tokens Launched', value: 1000, suffix: '+' },
  { label: 'Total Volume', value: 50, suffix: 'M+' },
  { label: 'Active Agents', value: 500, suffix: '+' },
  { label: 'Success Rate', value: 99, suffix: '%' },
];

const features = [
  {
    icon: Zap,
    title: 'Gasless Launches',
    description: 'Launch tokens without paying gas upfront. We handle the fees so you can focus on your project.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Agents',
    description: '71+ agent skills to automate token launches, trading, and social media management.',
  },
  {
    icon: Shield,
    title: 'Secure Platform',
    description: 'Built on Solana with audited contracts and enterprise-grade security.',
  },
  {
    icon: TrendingUp,
    title: 'Real-time Analytics',
    description: 'Track your token performance with comprehensive analytics and reporting.',
  },
];

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className="text-3xl font-bold text-[#ffd700]">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#ffd700]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#ff6b35]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ffd700]/10 border border-[#ffd700]/20 mb-8">
            <Sparkles className="w-4 h-4 text-[#ffd700]" />
            <span className="text-sm font-medium text-[#ffd700]">
              Powered by BAGS API
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="block text-white">The Sovereign</span>
            <span className="block gradient-text">Token Launchpad</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Launch tokens with AI-powered agents. Gasless launches, automated trading,
            and 71+ skills to grow your project on Solana.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/launch">
              <Button size="lg" className="gap-2 text-base">
                Launch Token
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/agent">
              <Button variant="outline" size="lg" className="gap-2 text-base">
                <Zap className="w-5 h-5" />
                Create Agent
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                <span className="mt-2 text-sm text-gray-400">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="relative group rounded-2xl bg-[#12121a] p-6 border border-[#2a2a3a] hover:border-[#ffd700]/50 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#ffd700]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-black" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Hero;
