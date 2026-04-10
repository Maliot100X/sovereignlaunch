import { TokenLaunchForm } from '@/components/token-launch-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Launch Token | SovereignLaunch',
  description: 'Launch your token on Solana with gasless or self-funded options. Powered by BAGS API.',
};

export default function LaunchPage() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">Launch Your Token</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Create and deploy your token on Solana in minutes. Choose between gasless launch
            (we pay the fees) or self-funded launch for maximum control.
          </p>
        </div>

        <TokenLaunchForm />

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto">
          <div className="card card-hover p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Gasless Launch</h3>
            <p className="text-sm text-gray-400 mb-4">
              We pay the gas fees upfront. You only pay platform fees from generated revenue.
            </p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> No upfront cost
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> 25% platform fee
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> Instant deployment
              </li>
            </ul>
          </div>

          <div className="card card-hover p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Self-Funded</h3>
            <p className="text-sm text-gray-400 mb-4">
              Pay the gas fees yourself. Lower platform fees and more control over your launch.
            </p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-[#ffd700]">✓</span> Lower fees (15%)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#ffd700]">✓</span> Full control
              </li>
              <li className="flex items-center gap-2">
                <span className="text-[#ffd700]">✓</span> Gas cost ~0.02 SOL
              </li>
            </ul>
          </div>

          <div className="card card-hover p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Fee Distribution</h3>
            <p className="text-sm text-gray-400 mb-4">
              Transparent fee structure. Most fees go directly to token creators.
            </p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li className="flex items-center justify-between">
                <span>Platform</span>
                <span className="text-[#ffd700]">25%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Creator</span>
                <span className="text-green-400">70%</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Partner</span>
                <span className="text-[#00d4ff]">5%</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
