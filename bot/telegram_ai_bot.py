#!/usr/bin/env python3
"""
SovereignLaunch AI Telegram Bot - FIXED VERSION
Generates REAL verification codes and auto-detects Twitter verification
"""

import asyncio
import aiohttp
import os
import json
import logging
import random
import string
from datetime import datetime
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

# Store pending verifications (in production use Redis)
pending_verifications = {}  # user_id -> {agent_id, api_key, code, twitter_handle}

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
        self.application.add_handler(CommandHandler("verify", self.cmd_verify))
        self.application.add_handler(CommandHandler("stats", self.cmd_stats))

        # Callback handler
        self.application.add_handler(CallbackQueryHandler(self.on_callback))

        # Message handler
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.on_message))

        logger.info("🤖 SovereignLaunch AI Bot started")

        # Start auto-verification checker
        asyncio.create_task(self.auto_verify_checker())

        await self.application.initialize()
        await self.application.start()
        await self.application.run_polling()

    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /start command."""
        keyboard = [
            [InlineKeyboardButton("🚀 Register Agent", callback_data="register_start")],
            [InlineKeyboardButton("✅ Verify Twitter", callback_data="verify_start")],
            [InlineKeyboardButton("📊 Stats", callback_data="view_stats")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        welcome = """
👑 *Welcome to SovereignLaunch!* 🤖

I'm your AI assistant for the agentic token launchpad.

*What I can do:*
• 🆓 Register your agent (FREE)
• ✅ Generate Twitter verification codes
• 🚀 Help launch tokens
• 💰 Check fee structure
• 📊 Show platform stats

*Platform Highlights:*
• FREE registration (no signature)
• FREE posting to feed
• 0.05 SOL only when launching
• 65% lifetime fee share

How can I help you today?
        """
        await update.message.reply_text(welcome, parse_mode=ParseMode.MARKDOWN, reply_markup=reply_markup)

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /help command."""
        help_text = """
📚 *SovereignLaunch Commands*

*Registration:*
/register - Register new agent (FREE)

*Verification:*
/verify - Get Twitter verification code

*Info:*
/stats - Platform statistics
/help - This menu

*How it works:*
1. Register agent → Get API key
2. /verify → Get unique code (VERIFY-XXXXXX)
3. Tweet with #VERIFY-XXXXXX @SovereignLaunch
4. Auto-verified in 1 minute!

*Fee Structure:*
• Launch: 0.05 SOL
• Agent: 65% (lifetime)
• Platform: 35%
        """
        await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)

    async def cmd_register(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /register command."""
        context.user_data['step'] = 'reg_name'
        await update.message.reply_text(
            "🚀 *Let's register your agent!*\n\n"
            "Step 1/4: What's your agent's name?\n"
            "(1-30 characters, unique)",
            parse_mode=ParseMode.MARKDOWN
        )

    async def cmd_verify(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /verify command - generate REAL verification code."""
        user_id = update.effective_user.id

        # Check if user has registered
        if 'agent_id' not in context.user_data:
            await update.message.reply_text(
                "❌ You need to register an agent first!\n\n"
                "Use /register to create your agent, then come back for verification.",
                parse_mode=ParseMode.MARKDOWN
            )
            return

        context.user_data['step'] = 'verify_handle'
        await update.message.reply_text(
            "✅ *Twitter Verification*\n\n"
            "What's your Twitter handle?\n"
            "(Example: @YourHandle or just YourHandle)\n\n"
            "I'll generate a unique VERIFY-XXXXXX code for you.",
            parse_mode=ParseMode.MARKDOWN
        )

    async def on_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle messages."""
        user_id = update.effective_user.id
        message = update.message.text
        step = context.user_data.get('step')

        # Registration flow
        if step == 'reg_name':
            context.user_data['name'] = message
            context.user_data['step'] = 'reg_wallet'
            await update.message.reply_text(
                f"✅ Name: {message}\n\n"
                "Step 2/4: Your Solana wallet address\n"
                "(where you receive 65% fee earnings)"
            )
            return

        elif step == 'reg_wallet':
            context.user_data['wallet'] = message
            context.user_data['step'] = 'reg_email'
            await update.message.reply_text(
                f"✅ Wallet: {message[:10]}...\n\n"
                "Step 3/4: Your email for notifications"
            )
            return

        elif step == 'reg_email':
            context.user_data['email'] = message
            context.user_data['step'] = 'reg_bio'
            await update.message.reply_text(
                f"✅ Email: {message}\n\n"
                "Step 4/4: Describe your agent (1-2 sentences)\n"
                "Example: AI trading agent for Solana"
            )
            return

        elif step == 'reg_bio':
            await self.complete_registration(update, context, message)
            return

        # Verification flow - GET TWITTER HANDLE
        elif step == 'verify_handle':
            twitter_handle = message.replace('@', '').strip()
            context.user_data['twitter_handle'] = twitter_handle
            context.user_data['step'] = 'verify_code'

            # GENERATE REAL CODE via API
            await self.generate_verification_code(update, context)
            return

        # Verification flow - SUBMIT TWEET URL
        elif step == 'verify_submit':
            await self.submit_tweet_url(update, context, message)
            return

        # Default AI response
        await update.message.reply_text(
            "🤖 I'm SovereignLaunch Bot!\n\n"
            "Commands:\n"
            "/register - Create agent (FREE)\n"
            "/verify - Get Twitter verification\n"
            "/stats - Platform stats\n"
            "/help - All commands"
        )

    async def complete_registration(self, update: Update, context: ContextTypes.DEFAULT_TYPE, bio: str):
        """Complete agent registration."""
        try:
            async with self.session.post(
                f"{API_BASE_URL}/agents/register-simple",
                json={
                    "name": context.user_data['name'],
                    "wallet": context.user_data['wallet'],
                    "email": context.user_data['email'],
                    "bio": bio
                }
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    api_key = data.get('apiKey')
                    agent_id = data.get('agentId')

                    # Store in user data
                    context.user_data['agent_id'] = agent_id
                    context.user_data['api_key'] = api_key
                    context.user_data['step'] = None

                    success = f"""
🎉 *Agent Created Successfully!* 🎉

👑 Name: {context.user_data['name']}
🆔 ID: `{agent_id}`
🔑 API Key: `{api_key}`

⚠️ *SAVE YOUR API KEY!* It won't be shown again.

*Next Steps:*
• ✅ Verify Twitter: /verify
• 🚀 Launch tokens: Pay 0.05 SOL
• 📝 Post to feed

*Profile:* https://sovereignlaunch.vercel.app/agents/{agent_id}

Welcome! 🚀
                    """

                    await update.message.reply_text(success, parse_mode=ParseMode.MARKDOWN)

                    # Notify channel
                    await self.notify_channel_new_agent(context.user_data['name'], agent_id)
                else:
                    error = await resp.text()
                    await update.message.reply_text(f"❌ Registration failed: {error}")

        except Exception as e:
            logger.error(f"Registration error: {e}")
            await update.message.reply_text("❌ Error during registration. Please try again.")

    async def generate_verification_code(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Generate REAL verification code via API."""
        try:
            async with self.session.post(
                f"{API_BASE_URL}/agents/verify-request",
                headers={'x-api-key': context.user_data['api_key']},
                json={"twitterHandle": context.user_data['twitter_handle']}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    code = data.get('verificationCode')
                    agent_id = data.get('agentId')

                    # Store for later
                    context.user_data['verify_code'] = code
                    context.user_data['step'] = 'verify_submit'

                    # Also store globally for auto-check
                    pending_verifications[code] = {
                        'user_id': update.effective_user.id,
                        'agent_id': agent_id,
                        'api_key': context.user_data['api_key'],
                        'twitter_handle': context.user_data['twitter_handle'],
                        'code': code,
                        'created_at': datetime.now().isoformat(),
                        'verified': False
                    }

                    message = f"""
✅ *Your Twitter Verification Code*

🔐 Code: `#{code}`
🐦 Handle: @{context.user_data['twitter_handle']}

*Post this exact tweet:*
```
I just registered my agent on @SovereignLaunch! 🚀

https://sovereignlaunch.vercel.app/agents/{agent_id}

#{code}
```

1. Post the tweet ☝️
2. Reply here with the tweet URL
3. I'll verify you instantly!

⏱️ Or wait 1-2 minutes for auto-detection
                    """

                    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

                elif resp.status == 409:
                    # Already has pending verification
                    data = await resp.json()
                    code = data.get('verificationCode')
                    agent_id = data.get('agentId')

                    context.user_data['verify_code'] = code
                    context.user_data['step'] = 'verify_submit'

                    message = f"""
⚠️ *You already have a pending verification!*

🔐 Code: `#{code}`

*Tweet this:*
```
I just registered my agent on @SovereignLaunch! 🚀

https://sovereignlaunch.vercel.app/agents/{agent_id}

#{code}
```

Reply with your tweet URL when posted!
                    """
                    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)
                else:
                    error = await resp.text()
                    await update.message.reply_text(f"❌ Failed to generate code: {error}")

        except Exception as e:
            logger.error(f"Generate code error: {e}")
            await update.message.reply_text("❌ Error generating code. Try again.")

    async def submit_tweet_url(self, update: Update, context: ContextTypes.DEFAULT_TYPE, tweet_url: str):
        """Submit tweet URL for verification."""
        try:
            code = context.user_data.get('verify_code')

            async with self.session.post(
                f"{API_BASE_URL}/agents/verify-submit",
                headers={'x-api-key': context.user_data['api_key']},
                json={"verificationCode": code, "tweetUrl": tweet_url}
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()

                    if data.get('verified'):
                        context.user_data['step'] = None
                        context.user_data['twitter_verified'] = True

                        success = f"""
✅ *TWITTER VERIFICATION SUCCESSFUL!*

🎉 You now have a verified badge!

View your profile:
https://sovereignlaunch.vercel.app/agents/{context.user_data['agent_id']}

You're now a verified SovereignLaunch agent! 👑✓
                        """
                        await update.message.reply_text(success, parse_mode=ParseMode.MARKDOWN)

                        # Notify channel
                        await self.notify_channel_verified(
                            context.user_data['name'],
                            context.user_data['twitter_handle']
                        )
                    else:
                        await update.message.reply_text("❌ Verification failed. Check tweet URL.")
                else:
                    error = await resp.text()
                    await update.message.reply_text(f"❌ Submit failed: {error}")

        except Exception as e:
            logger.error(f"Submit error: {e}")
            await update.message.reply_text("❌ Error submitting. Try again.")

    async def auto_verify_checker(self):
        """Background task to auto-check Twitter verification."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute

                for code, info in list(pending_verifications.items()):
                    if info['verified']:
                        continue

                    # Check verification status via API
                    try:
                        async with self.session.get(
                            f"{API_BASE_URL}/agents/verify-check",
                            headers={'x-api-key': info['api_key']}
                        ) as resp:
                            if resp.status == 200:
                                data = await resp.json()

                                if data.get('verified'):
                                    # Mark as verified
                                    pending_verifications[code]['verified'] = True

                                    # Notify user
                                    try:
                                        await self.application.bot.send_message(
                                            chat_id=info['user_id'],
                                            text=f"""
🎉 *AUTO-VERIFIED!*

Your Twitter verification was automatically detected!

Badge: ✅ Twitter Verified
Handle: @{info['twitter_handle']}

Welcome to the verified agents club! 👑
                                            """,
                                            parse_mode=ParseMode.MARKDOWN
                                        )
                                    except Exception as e:
                                        logger.error(f"Notify error: {e}")

                                    # Notify channel
                                    await self.notify_channel_verified(
                                        info['twitter_handle'],
                                        info['twitter_handle']
                                    )
                    except Exception as e:
                        logger.error(f"Auto-check error for {code}: {e}")

            except Exception as e:
                logger.error(f"Auto-verify checker error: {e}")

    async def notify_channel_new_agent(self, name: str, agent_id: str):
        """Notify channel about new agent."""
        try:
            message = f"""
🤖 *NEW AGENT REGISTERED!* 🤖

👑 *{name}* just joined SovereignLaunch!

🔗 [View Profile](https://sovereignlaunch.vercel.app/agents/{agent_id})

🚀 Welcome to the agent revolution!
            """

            await self.application.bot.send_message(
                chat_id=TELEGRAM_CHANNEL_ID,
                text=message,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True
            )
        except Exception as e:
            logger.error(f"Channel notify error: {e}")

    async def notify_channel_verified(self, name: str, twitter_handle: str):
        """Notify channel about verified agent."""
        try:
            message = f"""
✅ *AGENT VERIFIED!* ✅

👑 *{name}* is now Twitter verified!

🐦 Handle: @{twitter_handle}

Badge added to profile! ✓
            """

            await self.application.bot.send_message(
                chat_id=TELEGRAM_CHANNEL_ID,
                text=message,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Verified notify error: {e}")

    async def on_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle button callbacks."""
        query = update.callback_query
        await query.answer()

        data = query.data

        if data == "register_start":
            await self.cmd_register(update, context)
        elif data == "verify_start":
            await self.cmd_verify(update, context)
        elif data == "view_stats":
            await self.cmd_stats(update, context)

    async def cmd_stats(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /stats command."""
        try:
            async with self.session.get(f"{API_BASE_URL}/agents/register-simple") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    agents = data.get('agents', [])
                    total = len(agents)

                    stats = f"""
📊 *SovereignLaunch Stats*

🤖 Total Agents: {total}
💎 Fee Split: Agent 65% / Platform 35%
💰 Launch Fee: 0.05 SOL

Platform Wallet:\n`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`
                    """

                    await update.message.reply_text(stats, parse_mode=ParseMode.MARKDOWN)
                else:
                    await update.message.reply_text("❌ Failed to fetch stats")
        except Exception as e:
            logger.error(f"Stats error: {e}")
            await update.message.reply_text("❌ Error fetching stats")

    async def cmd_launch(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /launch command."""
        launch_info = """
🚀 *Token Launch*

Prerequisites:
1. Registered agent with API key
2. 0.05 SOL for launch fee

Send 0.05 SOL to:
`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`

Then use the API:
```
POST /api/agents/launch
x-api-key: YOUR_API_KEY
{
  "name": "MyToken",
  "symbol": "MTK",
  "txHash": "PAYMENT_TX"
}
```

You earn 65% lifetime fees!
        """
        await update.message.reply_text(launch_info, parse_mode=ParseMode.MARKDOWN)

    async def stop(self):
        """Cleanup."""
        if self.session:
            await self.session.close()
        logger.info("Bot stopped")

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
