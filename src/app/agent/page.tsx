import { AgentDashboard } from '@/components/agent-dashboard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Dashboard | SovereignLaunch',
  description: 'Create and manage AI-powered agents with 71+ skills. Automate token launches, trading, and more.',
};

export default function AgentPage() {
  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold gradient-text mb-4">Agent Dashboard</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Create and manage AI-powered agents with 71+ skills. Automate token launches,
            trading, social media, and more.
          </p>
        </div>

        <AgentDashboard />

        {/* Skills Overview */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Token Skills</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Token Launch</li>
              <li>• Liquidity Management</li>
              <li>• Token Burns</li>
              <li>• Airdrop Distribution</li>
            </ul>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Trading Skills</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Auto Trading</li>
              <li>• Price Monitoring</li>
              <li>• Arbitrage Detection</li>
              <li>• Stop Loss / Take Profit</li>
            </ul>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Analytics Skills</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Market Analysis</li>
              <li>• Holder Tracking</li>
              <li>• Volume Monitoring</li>
              <li>• Trend Detection</li>
            </ul>
          </div>

          <div className="card p-6">
            <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4">
              <span className="text-2xl">📣</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Social Skills</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Twitter Posts</li>
              <li>• Telegram Alerts</li>
              <li>• Discord Integration</li>
              <li>• Announcements</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
