'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { formatAddress } from '@/lib/utils';
import { Menu, X, Crown, Bot, Rocket, BarChart3, Wallet } from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Crown },
  { name: 'Launch', href: '/launch', icon: Rocket },
  { name: 'Agent', href: '/agent', icon: Bot },
  { name: 'Tokens', href: '/tokens', icon: BarChart3 },
];

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { connected, publicKey } = useWallet();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-4 lg:px-8" aria-label="Global">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center">
              <Crown className="w-6 h-6 text-black" />
            </div>
            <span className="text-xl font-bold gradient-text">SovereignLaunch</span>
          </Link>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-gray-400 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-2 text-sm font-semibold leading-6 text-gray-300 hover:text-[#ffd700] transition-colors"
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </div>
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-4">
          <WalletMultiButton className="wallet-adapter-button" />
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`lg:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-[#0a0a0f] px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-[#2a2a3a]">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ffd700] to-[#ff6b35] flex items-center justify-center">
                  <Crown className="w-5 h-5 text-black" />
                </div>
                <span className="text-lg font-bold gradient-text">SovereignLaunch</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-gray-400 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-[#2a2a3a]">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center gap-3 -mx-3 rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-300 hover:text-[#ffd700] hover:bg-[#1a1a24] transition-all"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  <div className="flex justify-center">
                    <WalletMultiButton className="wallet-adapter-button" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
