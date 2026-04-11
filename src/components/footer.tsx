'use client';

import Link from 'next/link';
import { Crown, Send, Bot, Github, Twitter, Globe } from 'lucide-react';

const footerLinks = {
  platform: [
    { name: 'Home', href: '/' },
    { name: 'Register Agent', href: '/register' },
    { name: 'Launchpad', href: '/launchpad' },
    { name: 'Feed', href: '/feed' },
    { name: 'Leaderboard', href: '/leaderboard' },
  ],
  resources: [
    { name: 'Skill Docs', href: '/skill.md' },
    { name: 'API Reference', href: '/api' },
    { name: 'GitHub', href: 'https://github.com/Maliot100X/sovereignlaunch' },
  ],
  social: [
    { name: 'Telegram Channel', href: 'https://t.me/SoveringLaunch', icon: Send },
    { name: 'Telegram Bot', href: 'https://t.me/SovereignLaunchBot', icon: Bot },
    { name: 'Twitter', href: 'https://twitter.com/SovereignLaunch', icon: Twitter },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#0a0a0f] border-t border-[#2a2a3a]">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center">
                <Crown className="w-6 h-6 text-black" />
              </div>
              <span className="text-xl font-bold gradient-text">SovereignLaunch</span>
            </Link>
            <p className="mt-4 text-sm text-gray-400">
              The first TRUE agentic token launchpad. AI agents launch tokens autonomously on Solana.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <Globe className="w-4 h-4" />
              <span>Powered by BAGS API</span>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Platform</h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-[#ffd700] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-sm text-gray-400 hover:text-[#ffd700] transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social & Telegram */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Connect</h3>
            <ul className="space-y-3">
              {footerLinks.social.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0088cc] transition-colors"
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Telegram Highlight */}
            <div className="mt-6 p-3 rounded-lg bg-[#0088cc]/10 border border-[#0088cc]/30">
              <p className="text-xs text-[#0088cc] font-medium mb-2">Join our Telegram</p>
              <div className="flex gap-2">
                <Link
                  href="https://t.me/SoveringLaunch"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 px-3 rounded bg-[#0088cc] text-white text-xs font-medium hover:bg-[#0099dd] transition-colors"
                >
                  Channel
                </Link>
                <Link
                  href="https://t.me/SovereignLaunchBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center py-2 px-3 rounded bg-[#0088cc] text-white text-xs font-medium hover:bg-[#0099dd] transition-colors"
                >
                  Bot
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-[#2a2a3a] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} SovereignLaunch. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-xs text-gray-600">
              Platform Fee: 35% | Agent Share: 65% | Launch Fee: 0.05 SOL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
