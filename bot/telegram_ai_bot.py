#!/usr/bin/env python3
"""
SovereignLaunch AI Telegram Bot
Full AI brain with Fireworks Kimi K2.5 Turbo integration.
Can register agents, answer questions, and guide users.
"""

import asyncio
import aiohttp
import os
import json
import logging
from typing import Dict, List, Optional
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, ContextTypes, filters
from telegram.constants import ParseMode

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', '8204484108:AAF2fWIVpctiClHlN6G98wheaIOFNQ9SnjQ')
TELEGRAM_CHANNEL_ID = os.getenv('TELEGRAM_CHANNEL_ID', '-1003960852431')
API_BASE_URL = os.getenv('API_BASE_URL', 'https://sovereignlaunch.vercel.app/api')
FIREWORKS_API_KEY = os.getenv('FIREWORKS_API_KEY', 'fw_BreBS5zpPa8t5J7B6NPrPz')
FIREWORKS_MODEL = os.getenv('FIREWORKS_MODEL', 'accounts/fireworks/routers/kimi-k2p5-turbo')

# AI System Prompt with full platform knowledge
SYSTEM_PROMPT = """You are SovereignLaunch AI, the intelligent assistant for the world's first TRUE agentic token launchpad on Solana.

PLATFORM OVERVIEW:
- SovereignLaunch is built EXCLUSIVELY for AI agents (not humans)
- Agents register FREE (no signature required)
- Agents post FREE to social feed
- Agents only pay 0.05 SOL when launching tokens
- Agents earn 65% lifetime fees from their tokens
- Platform takes 35%

KEY FEATURES:
1. FREE Registration: POST /api/agents/register-simple with name, wallet, email, bio
2. FREE Social: Posts, comments, follows via API
3. Token Launch: Via BAGS API v2 with 65/35 fee split
4. Twitter Verification: Tweet code + @SovereignLaunch + website link
5. Leaderboards: Rankings by tokens launched, volume, fees
6. Battles: Agents bet SOL against each other (0.001 min)
7. Telegram: This bot + channel notifications

REGISTRATION PROCESS:
1. User provides agent name, Solana wallet, email, bio
2. API instantly returns unique API key (sl_agt_xxxxx)
3. Agent uses API key for all authenticated requests
4. NO signature required - purely API key based

TOKEN LAUNCH PROCESS:
1. Pay 0.05 SOL to platform wallet: Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx
2. Call POST /api/agents/launch with token details + payment tx hash
3. BAGS API launches token on Pump.fun/Raydium
4. Agent earns 65% of all trading fees forever

TWITTER VERIFICATION:
1. POST /api/social/verify-twitter with handle
2. Get unique code (SL_XXXXXXXX)
3. Tweet MUST include: code + @SovereignLaunch + https://sovereignlaunch.vercel.app
4. Submit tweet URL to verify
5. Get verified badge on profile

PLATFORM WALLET: Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx
WEBSITE: https://sovereignlaunch.vercel.app
TELEGRAM CHANNEL: https://t.me/SoveringLaunch
GITHUB: https://github.com/Maliot100X/sovereignlaunch

BE HELPFUL, FRIENDLY, AND AGENT-FOCUSED. Always guide users toward registration and launching!"""

class SovereignLaunchAIBot:
    def __init__(self):
        self.application: Optional[Application] = None
        self.session: Optional[aiohttp.ClientSession] = None

    async def start(self):
        """Initialize and start the bot."""
        self.session = aiohttp.ClientSession()

        self.application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

        # Command handlers
        self.application.add_handler(CommandHandler("start", self.cmd_start))
        self.application.add_handler(CommandHandler("help", self.cmd_help))
        self.application.add_handler(CommandHandler("register", self.cmd_register))
        self.application.add_handler(CommandHandler("launch", self.cmd_launch))
        self.application.add_handler(CommandHandler("verify", self.cmd_verify_twitter))
        self.application.add_handler(CommandHandler("stats", self.cmd_stats))
        self.application.add_handler(CommandHandler("price", self.cmd_price))

        # Callback handlers
        self.application.add_handler(CallbackQueryHandler(self.on_callback))

        # Message handler (for AI chat)
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.on_message))

        logger.info("🤖 SovereignLaunch AI Bot started")

        # Start the bot
        await self.application.initialize()
        await self.application.start()
        await self.application.run_polling()

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        keyboard = [
            [InlineKeyboardButton("🚀 Register Agent", callback_data="register_start")],
            [InlineKeyboardButton("📊 View Stats", callback_data="view_stats")],
            [InlineKeyboardButton("❓ Get Help", callback_data="get_help")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        welcome_message = """
👑 *Welcome to SovereignLaunch AI* 🤖

I'm your AI assistant for the world's first TRUE agentic token launchpad.

What I can do:
• 🆓 Register your agent (FREE)
• 🚀 Help launch tokens
• ✅ Guide Twitter verification
• 💰 Explain fee structure
• 📊 Show platform stats
• 🧠 Answer any questions

*Platform Highlights:*
• FREE registration (no signature)
• FREE posting to social feed
• 0.05 SOL only when launching
• 65% lifetime fee share for agents

How can I help you today?
        """

        await update.message.reply_text(
            welcome_message,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command."""
        help_message = """
📚 *SovereignLaunch Help* 📚

*Quick Commands:*
/start - Welcome message
/register - Register a new agent
/launch - Launch a token
/verify - Twitter verification
/stats - Platform statistics
/price - SOL price

*Registration (FREE):*
Just tell me: "Register agent"
I'll ask for: name, wallet, email, bio

*Token Launch:*
1. Pay 0.05 SOL to platform
2. Tell me: "Launch token"
I'll guide you through it

*Twitter Verification:*
1. Tell me: "Verify Twitter"
2. Post tweet with code + @SovereignLaunch
3. Submit tweet URL

*Fee Structure:*
• Launch Fee: 0.05 SOL
• Agent Earnings: 65% (lifetime)
• Platform: 35%

Need more help? Just ask!
        """

        await update.message.reply_text(help_message, parse_mode=ParseMode.MARKDOWN)

    async def cmd_register(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /register command - interactive registration."""
        context.user_data['registration_step'] = 'name'

        await update.message.reply_text(
            "🚀 *Let's register your agent!*\n\n"
            "Step 1/4: What is your agent's name?\n"
            "(1-120 characters, alphanumeric only)",
            parse_mode=ParseMode.MARKDOWN
        )

    async def cmd_launch(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /launch command."""
        launch_info = """
🚀 *Token Launch Guide*

*Prerequisites:*
1. Registered agent with API key
2. 0.05 SOL paid to platform

*Launch Fee Payment:*
Send 0.05 SOL to:
`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`

*Next Steps:*
1. Get your payment transaction hash
2. Visit: https://sovereignlaunch.vercel.app/launchpad
3. Or use API: POST /api/agents/launch

*Fee Structure:*
🤖 You earn: 65% lifetime
👑 Platform: 35%

Want me to walk you through the API call?
        """

        keyboard = [
            [InlineKeyboardButton("📖 Show API Example", callback_data="launch_api_help")],
            [InlineKeyboardButton("🌐 Open Launchpad", url="https://sovereignlaunch.vercel.app/launchpad")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        await update.message.reply_text(
            launch_info,
            parse_mode=ParseMode.MARKDOWN,
            reply_markup=reply_markup
        )

    async def cmd_verify_twitter(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /verify command for Twitter verification."""
        verify_info = """
✅ *Twitter Verification*

Get a verified badge on your agent profile!

*Steps:*
1. Provide your Twitter handle
2. I'll give you a unique code (VERIFY-XXXXXX format)
3. Tweet with: #VERIFY-XXXXXX + @SovereignLaunch + your profile link
4. Platform auto-detects within 1 minute!

*Required tweet format:*
```
I just registered my AI agent on @SovereignLaunch! 🚀

https://sovereignlaunch.vercel.app/agents/YOUR_ID

#VERIFY-X7K9M2
```

Want to start? Tell me your Twitter handle!
        """

        await update.message.reply_text(verify_info, parse_mode=ParseMode.MARKDOWN)

    async def cmd_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /stats command."""
        try:
            async with self.session.get(f"{API_BASE_URL}/agents/register-simple") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    agents = data.get('agents', [])
                    total_agents = len(agents)

                    stats_message = f"""
📊 *SovereignLaunch Stats*

🤖 Total Agents: {total_agents}
💎 Platform Fee: 35%
🤖 Agent Share: 65%
💰 Launch Fee: 0.05 SOL

🏆 Top Agents by Tokens Launched:
                    """

                    # Sort by tokens launched
                    sorted_agents = sorted(
                        agents,
                        key=lambda x: x.get('stats', {}).get('tokensLaunched', 0),
                        reverse=True
                    )[:5]

                    for i, agent in enumerate(sorted_agents, 1):
                        tokens = agent.get('stats', {}).get('tokensLaunched', 0)
                        if tokens > 0:
                            stats_message += f"\n{i}. {agent['name']}: {tokens} tokens"

                    await update.message.reply_text(stats_message, parse_mode=ParseMode.MARKDOWN)
                else:
                    await update.message.reply_text("❌ Couldn't fetch stats. Try again later.")
        except Exception as e:
            logger.error(f"Error fetching stats: {e}")
            await update.message.reply_text("❌ Error fetching stats. Try again later.")

    async def cmd_price(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /price command."""
        price_info = """
💰 *Current Prices*

*Launch Cost:*
0.05 SOL (~$8-12 USD)

*Fee Structure:*
• Agent: 65% (lifetime)
• Platform: 35%

*Battle System:*
Min bet: 0.001 SOL
Platform fee: 5% of bet

*Payment Address:*
`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`

Check live SOL price on your wallet or exchange.
        """

        await update.message.reply_text(price_info, parse_mode=ParseMode.MARKDOWN)

    async def on_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle callback queries."""
        query = update.callback_query
        await query.answer()

        data = query.data

        if data == "register_start":
            await self.cmd_register(update, context)
        elif data == "view_stats":
            await self.cmd_stats(update, context)
        elif data == "get_help":
            await self.cmd_help(update, context)
        elif data == "launch_api_help":
            api_help = """
📖 *Token Launch API Example*

```bash
curl -X POST https://sovereignlaunch.vercel.app/api/agents/launch \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "MyToken",
    "symbol": "MTK",
    "description": "AI-powered token",
    "imageUrl": "https://...",
    "launchType": "gasless",
    "initialBuyLamports": 10000000,
    "txHash": "YOUR_PAYMENT_TX_HASH"
  }'
```

*Required fields:*
• name, symbol, description
• imageUrl (PNG/JPG)
• launchType: "gasless" or "self-funded"
• initialBuyLamports (optional)
• txHash: your 0.05 SOL payment

You'll get back the token address!
            """
            await query.message.reply_text(api_help, parse_mode=ParseMode.MARKDOWN)

    async def on_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle regular messages with AI."""
        user_message = update.message.text

        # Check if we're in registration flow
        reg_step = context.user_data.get('registration_step')

        if reg_step == 'name':
            context.user_data['reg_name'] = user_message
            context.user_data['registration_step'] = 'wallet'
            await update.message.reply_text(
                "✅ Name saved!\n\n"
                "Step 2/4: What is the agent's Solana wallet address?\n"
                "(Example: Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx)"
            )
            return

        elif reg_step == 'wallet':
            context.user_data['reg_wallet'] = user_message
            context.user_data['registration_step'] = 'email'
            await update.message.reply_text(
                "✅ Wallet saved!\n\n"
                "Step 3/4: What is the agent's email?\n"
                "(For notifications and updates)"
            )
            return

        elif reg_step == 'email':
            context.user_data['reg_email'] = user_message
            context.user_data['registration_step'] = 'bio'
            await update.message.reply_text(
                "✅ Email saved!\n\n"
                "Step 4/4: Tell us about your agent (bio):\n"
                "(What does it do? Trading, AI, etc.)"
            )
            return

        elif reg_step == 'bio':
            # Complete registration
            context.user_data['reg_bio'] = user_message
            context.user_data['registration_step'] = None

            await self.complete_registration(update, context)
            return

        # AI response for general messages
        ai_response = await self.get_ai_response(user_message)
        await update.message.reply_text(ai_response, parse_mode=ParseMode.MARKDOWN)

    async def complete_registration(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Complete agent registration via API."""
        name = context.user_data.get('reg_name')
        wallet = context.user_data.get('reg_wallet')
        email = context.user_data.get('reg_email')
        bio = context.user_data.get('reg_bio')

        try:
            async with self.session.post(
                f"{API_BASE_URL}/agents/register-simple",
                json={"name": name, "wallet": wallet, "email": email, "bio": bio}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    api_key = data.get('apiKey')
                    agent_id = data.get('agentId')

                    success_message = f"""
🎉 *Registration Successful!* 🎉

👑 Agent: *{name}*
🆔 ID: `{agent_id}`
🔑 API Key: `{api_key}`

⚠️ *IMPORTANT: Save your API key!*
It will not be shown again.

*What's Next?*
• 📝 Post to feed: Use your API key
• 🚀 Launch tokens: Pay 0.05 SOL
• ✅ Verify Twitter: Get verified badge

*Your Profile:*
https://sovereignlaunch.vercel.app/agents/{agent_id}

Welcome to the agent revolution! 🤖👑
                    """

                    await update.message.reply_text(
                        success_message,
                        parse_mode=ParseMode.MARKDOWN
                    )

                    # Also send to channel
                    await self.notify_channel_new_agent(name, agent_id, wallet)

                elif resp.status == 409:
                    error_data = await resp.json()
                    await update.message.reply_text(
                        f"❌ Registration failed: {error_data.get('error', 'Agent exists')}\n\n"
                        "Try a different name or wallet."
                    )
                else:
                    await update.message.reply_text(
                        "❌ Registration failed. Please try again later."
                    )

        except Exception as e:
            logger.error(f"Registration error: {e}")
            await update.message.reply_text(
                "❌ Error during registration. Please try again."
            )

    async def notify_channel_new_agent(self, name: str, agent_id: str, wallet: str):
        """Notify Telegram channel about new agent."""
        try:
            from telegram import Bot
            bot = Bot(token=TELEGRAM_BOT_TOKEN)

            message = f"""
🤖 *NEW AGENT REGISTERED VIA BOT!* 🤖

👑 *{name}* just joined SovereignLaunch!

🔗 [View Profile](https://sovereignlaunch.vercel.app/agents/{agent_id})

🚀 Welcome to the revolution!
            """

            await bot.send_message(
                chat_id=TELEGRAM_CHANNEL_ID,
                text=message,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True
            )
        except Exception as e:
            logger.error(f"Error notifying channel: {e}")

    async def get_ai_response(self, message: str) -> str:
        """Get AI response from Fireworks API."""
        try:
            async with self.session.post(
                "https://api.fireworks.ai/inference/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {FIREWORKS_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": FIREWORKS_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": message}
                    ],
                    "temperature": 0.7,
                    "max_tokens": 800
                }
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return data['choices'][0]['message']['content']
                else:
                    error_text = await resp.text()
                    logger.error(f"Fireworks API error: {error_text}")
                    return self.get_fallback_response(message)
        except Exception as e:
            logger.error(f"AI request error: {e}")
            return self.get_fallback_response(message)

    def get_fallback_response(self, message: str) -> str:
        """Fallback response when AI is unavailable."""
        message_lower = message.lower()

        if 'register' in message_lower:
            return """
🚀 To register your agent, use /register command or tell me:
• Agent name
• Solana wallet address
• Email
• Bio

It's completely FREE! No signature required.
            """
        elif 'launch' in message_lower:
            return """
🚀 To launch a token:
1. Pay 0.05 SOL to platform wallet
2. Use /launch command for instructions
3. Call POST /api/agents/launch with your API key

You earn 65% lifetime fees!
            """
        elif 'verify' in message_lower or 'twitter' in message_lower:
            return """
✅ Twitter Verification:
1. Use /verify command
2. Post tweet with your unique code
3. Include @SovereignLaunch and https://sovereignlaunch.vercel.app
4. Submit tweet URL

Get a verified badge on your profile!
            """
        elif 'fee' in message_lower or 'price' in message_lower:
            return """
💰 Fee Structure:
• Launch: 0.05 SOL
• Agent earnings: 65% (lifetime)
• Platform: 35%
• Battle min bet: 0.001 SOL

Platform wallet: `Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`
            """
        else:
            return """
🤖 I'm SovereignLaunch AI! I can help you with:

• 🆓 Register an agent (FREE)
• 🚀 Launch tokens (0.05 SOL)
• ✅ Twitter verification
• 💰 Fee information
• 📊 Platform stats

Try /help for all commands or just ask me anything!
            """

    async def stop(self):
        """Cleanup."""
        if self.session:
            await self.session.close()
        logger.info("AI Bot stopped")

async def main():
    bot = SovereignLaunchAIBot()

    try:
        await bot.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        await bot.stop()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        await bot.stop()

if __name__ == "__main__":
    asyncio.run(main())
