import 'server-only';
import { Telegraf, Context } from 'telegraf';
import type { NotificationMessage } from '@/types';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID || '';
const ADMIN_ID = process.env.TELEGRAM_ADMIN_ID || '';

class TelegramBotService {
  private bot: Telegraf<Context> | null = null;
  private isRunning: boolean = false;

  constructor() {
    if (!BOT_TOKEN) {
      console.warn('[Telegram Bot] No token provided, bot will not start');
      return;
    }

    this.bot = new Telegraf(BOT_TOKEN);
    this.setupCommands();
    this.setupHandlers();
  }

  private setupCommands(): void {
    if (!this.bot) return;

    this.bot.command('start', async (ctx) => {
      const isAdmin = ctx.from?.id.toString() === ADMIN_ID;
      const welcomeMessage = `
🚀 *Welcome to SovereignLaunch Bot* 🚀

Your agentic token launchpad powered by BAGS API.

*Available Commands:*
/start - Show this welcome message
/launch - Launch a new token
/agents - Manage your agents
/tokens - List launched tokens
/fees - View claimable fees
/help - Get help and documentation
${isAdmin ? '\n*Admin Commands:*\n/stats - Platform statistics\n/broadcast - Send announcement' : ''}

Connect your wallet at: ${process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app'}
      `;

      await ctx.replyWithMarkdownV2(welcomeMessage);
    });

    this.bot.command('help', async (ctx) => {
      const helpMessage = `
📚 *SovereignLaunch Help* 📚

*Getting Started:*
1. Connect your Solana wallet on our platform
2. Create or configure your agent
3. Launch tokens or let your agent do it!

*Launch Types:*
• *Gasless Launch* - We pay the gas, you pay fees later
• *Self-Funded Launch* - You pay gas upfront, lower fees

*Fee Structure:*
• Agent Earnings: 65% (lifetime)
• Platform: 35%
• Launch Fee: 0.05 SOL per token

*Agent Skills:*
Our agents have 71+ skills including:
- Token launching
- Trading automation
- Fee claiming
- Social posting
- Analytics tracking

*Need more help?*
Visit: ${process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app'}
      `;

      await ctx.replyWithMarkdownV2(helpMessage);
    });

    this.bot.command('launch', async (ctx) => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🚀 Launch Token', callback_data: 'launch_token' },
            { text: '📊 View Tokens', callback_data: 'view_tokens' }
          ],
          [
            { text: '⚙️ Agent Dashboard', url: `${process.env.NEXT_PUBLIC_API_URL}/agent` }
          ]
        ]
      };

      await ctx.reply('🎯 Ready to launch a token?', {
        reply_markup: keyboard
      });
    });

    this.bot.command('tokens', async (ctx) => {
      await ctx.reply('📊 View all tokens at:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/tokens');
    });

    this.bot.command('agents', async (ctx) => {
      const keyboard = {
        inline_keyboard: [
          [
            { text: '🤖 Create Agent', url: `${process.env.NEXT_PUBLIC_API_URL}/agent` },
            { text: '📈 View Agents', callback_data: 'view_agents' }
          ],
          [
            { text: '⚡ Quick Launch', callback_data: 'quick_launch' }
          ]
        ]
      };

      await ctx.reply('🤖 Manage Your Agents', {
        reply_markup: keyboard
      });
    });

    this.bot.command('fees', async (ctx) => {
      await ctx.reply('💰 Connect your wallet on the platform to view and claim fees:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/agent');
    });

    this.bot.command('stats', async (ctx) => {
      if (ctx.from?.id.toString() !== ADMIN_ID) {
        await ctx.reply('❌ This command is only available to admins.');
        return;
      }

      await ctx.reply('📊 Stats are available on the platform dashboard:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app'));
    });
  }

  private setupHandlers(): void {
    if (!this.bot) return;

    this.bot.on('callback_query', async (ctx) => {
      const data = (ctx.callbackQuery as any).data as string | undefined;
      if (!data) return;

      switch (data) {
        case 'launch_token':
          await ctx.reply('🚀 Visit the platform to launch your token:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/launch');
          break;

        case 'view_tokens':
          await ctx.reply('📊 View all tokens at:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/tokens');
          break;

        case 'view_agents':
          await ctx.reply('🤖 Your agents dashboard:\n' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/agent');
          break;

        case 'quick_launch':
          await ctx.reply('⚡ Quick Launch Mode:\n' +
            '1. Connect wallet\n' +
            '2. Set token name & symbol\n' +
            '3. Launch instantly!\n\n' +
            'Start here: ' + (process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app') + '/launch');
          break;

        default:
          await ctx.answerCbQuery('Unknown action');
      }
    });
  }

  async start(): Promise<void> {
    if (!this.bot || this.isRunning) return;

    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log('[Telegram Bot] Started successfully');

      if (CHANNEL_ID) {
        await this.bot.telegram.sendMessage(
          CHANNEL_ID,
          '🤖 *SovereignLaunch Bot is Online*\n\nReady to launch tokens and manage agents!',
          { parse_mode: 'MarkdownV2' }
        );
      }
    } catch (error) {
      console.error('[Telegram Bot] Failed to start:', error);
    }
  }

  async stop(): Promise<void> {
    if (!this.bot || !this.isRunning) return;

    this.bot.stop();
    this.isRunning = false;
    console.log('[Telegram Bot] Stopped');
  }

  async notifyLaunch(tokenAddress: string, tokenSymbol: string, tokenName: string, creator: string): Promise<void> {
    if (!this.bot || !CHANNEL_ID) return;

    const message = `
🚀 *NEW TOKEN LAUNCHED!* 🚀

*${tokenName}* ($${tokenSymbol})

👤 Creator: \`${creator.slice(0, 6)}...${creator.slice(-4)}\`
🔗 Address: \`${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}\`

[View on Solscan](https://solscan.io/token/${tokenAddress})
[Trade on SovereignLaunch](${process.env.NEXT_PUBLIC_API_URL}/tokens)
    `;

    try {
      await this.bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      } as any);
    } catch (error) {
      console.error('[Telegram Bot] Failed to send launch notification:', error);
    }
  }

  async notifyTrade(tokenSymbol: string, type: 'buy' | 'sell', amount: string, value: string): Promise<void> {
    if (!this.bot || !CHANNEL_ID) return;

    const emoji = type === 'buy' ? '🟢' : '🔴';
    const message = `
${emoji} *${type.toUpperCase()} ALERT* ${emoji}

*$${tokenSymbol}*
Amount: ${amount}
Value: $${value}

[Trade Now](${process.env.NEXT_PUBLIC_API_URL}/tokens)
    `;

    try {
      await this.bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      } as any);
    } catch (error) {
      console.error('[Telegram Bot] Failed to send trade notification:', error);
    }
  }

  async notifyFeeClaim(tokenSymbol: string, amount: string, claimer: string): Promise<void> {
    if (!this.bot || !CHANNEL_ID) return;

    const message = `
💰 *FEES CLAIMED!* 💰

*$${tokenSymbol}*
Amount: ${amount}
By: \`${claimer.slice(0, 6)}...${claimer.slice(-4)}\`
    `;

    try {
      await this.bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      } as any);
    } catch (error) {
      console.error('[Telegram Bot] Failed to send fee claim notification:', error);
    }
  }

  async sendNotification(notification: NotificationMessage): Promise<void> {
    if (!this.bot || !CHANNEL_ID) return;

    const icons: Record<string, string> = {
      launch: '🚀',
      trade: '💹',
      fee: '💰',
      system: 'ℹ️'
    };

    const message = `
${icons[notification.type]} *${notification.title}* ${icons[notification.type]}

${notification.message}

_${new Date(notification.timestamp).toLocaleString()}_
    `;

    try {
      await this.bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2'
      });
    } catch (error) {
      console.error('[Telegram Bot] Failed to send notification:', error);
    }
  }

  async notifyAgentRegistered(agentName: string, agentId: string, wallet: string): Promise<void> {
    if (!this.bot || !CHANNEL_ID) return;

    const message = `
🤖 *NEW AGENT REGISTERED!* 🤖

*${agentName}* has joined SovereignLaunch!

👤 Wallet: \`${wallet.slice(0, 6)}...${wallet.slice(-4)}\`
🆔 Agent ID: \`${agentId.slice(0, 8)}...\`

Welcome to the agent revolution! 🚀

[View Agent Profile](${process.env.NEXT_PUBLIC_API_URL || 'https://sovereignlaunch.vercel.app'}/agents/${agentId})
    `;

    try {
      await this.bot.telegram.sendMessage(CHANNEL_ID, message, {
        parse_mode: 'MarkdownV2',
        link_preview_options: { is_disabled: true }
      } as any);
      console.log(`[Telegram Bot] Agent registration notification sent for ${agentName}`);
    } catch (error) {
      console.error('[Telegram Bot] Failed to send agent registration notification:', error);
    }
  }
}

export const telegramBot = new TelegramBotService();
export default telegramBot;
