// Client-side stub for telegram bot
// The actual bot runs server-side only in src/lib/telegram-server.ts

import type { NotificationMessage } from '@/types';

class TelegramBotStub {
  async notifyLaunch(tokenAddress: string, tokenSymbol: string, tokenName: string, creator: string): Promise<void> {
    // Client-side: Call API instead
    try {
      await fetch('/api/bags/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: tokenName,
          symbol: tokenSymbol,
          creatorWallet: creator,
          launchType: 'gasless',
          description: ''
        })
      });
    } catch {
      // Silently fail on client
    }
  }

  async notifyTrade(tokenSymbol: string, type: 'buy' | 'sell', amount: string, value: string): Promise<void> {
    // No-op on client side
  }

  async notifyFeeClaim(tokenSymbol: string, amount: string, claimer: string): Promise<void> {
    // No-op on client side
  }

  async sendNotification(notification: NotificationMessage): Promise<void> {
    // No-op on client side
  }

  async start(): Promise<void> {
    // No-op on client side
  }

  async stop(): Promise<void> {
    // No-op on client side
  }
}

export const telegramBot = new TelegramBotStub();
export default telegramBot;
