#!/usr/bin/env python3
"""
SovereignLaunch AI Telegram Bot - FIXED VERSION
Generates REAL verification codes and auto-detects Twitter verification
Added: /ask command for Fireworks AI chat
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

# Fireworks AI Configuration
# Using Kimi K2.5 Turbo via Fireworks router
FIREWORKS_MODEL = "accounts/fireworks/routers/kimi-k2p5-turbo"
FIREWORKS_URL = "https://api.fireworks.ai/inference/v1/chat/completions"

# Store pending verifications (in production use Redis)
pending_verifications = {}  # user_id -> {agent_id, api_key, code, twitter_handle}

# Conversation history for /ask command
conversation_history = {}  # user_id -> list of messages

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
        self.application.add_handler(CommandHandler("skip", self.cmd_skip))  # NEW: Skip verification
        self.application.add_handler(CommandHandler("stats", self.cmd_stats))
        self.application.add_handler(CommandHandler("ask", self.cmd_ask))  # NEW: AI chat

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
            [InlineKeyboardButton("🤖 Ask AI", callback_data="ask_ai")],
            [InlineKeyboardButton("📊 Stats", callback_data="view_stats")]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)

        welcome = """
👑 *Welcome to SovereignLaunch!* 🤖

I'm your AI assistant for the agentic token launchpad.

*What I can do:*
• 🆓 Register your agent (FREE)
• ✅ Generate Twitter verification codes
• 🤖 Chat with AI (/ask)
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
/skip - Skip Twitter verification (optional)

*AI Chat:*
/ask <question> - Chat with Fireworks AI (Kimi K2.5 Turbo)

*Info:*
/stats - Platform statistics
/help - This menu

*How Verification Works:*
1. Register agent → Get API key ✓
2. /verify → Get unique code (VERIFY-XXXXXX)
3. Post tweet with code + @SovereignLaunch
4. Reply with tweet URL → INSTANT verification ⚡

Or type "skip" anytime to skip verification.

*Fee Structure:*
• Registration: FREE ✓
• Posting: FREE ✓
• Launch: 0.05 SOL
• Agent earns: 65% lifetime fees
• Platform: 35%

*Quick Links:*
Website: https://sovereignlaunch.vercel.app
        """
        await update.message.reply_text(help_text, parse_mode=ParseMode.MARKDOWN)

    async def cmd_ask(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /ask command - Chat with Fireworks AI."""
        user_id = update.effective_user.id
        message_text = update.message.text

        # Extract the question (remove /ask command)
        question = message_text.replace('/ask', '').strip()

        if not question:
            await update.message.reply_text(
                "🤖 *Ask me anything!*\n\n"
                "Usage: `/ask What is Solana?`\n\n"
                "I'll answer using Fireworks AI (Kimi K2.5 Turbo).",
                parse_mode=ParseMode.MARKDOWN
            )
            return

        # Show typing indicator
        await update.message.chat.send_action(action="typing")

        try:
            # Get or create conversation history
            if user_id not in conversation_history:
                conversation_history[user_id] = []

            # Add user message to history
            conversation_history[user_id].append({"role": "user", "content": question})

            # Keep only last 10 messages for context
            if len(conversation_history[user_id]) > 10:
                conversation_history[user_id] = conversation_history[user_id][-10:]

            # Prepare system message
            system_message = {
                "role": "system",
                "content": "You are SovereignLaunch AI, a helpful assistant for the SovereignLaunch token launchpad platform on Solana. "
                           "You help users with questions about blockchain, crypto, token launching, and the platform. "
                           "Be concise, helpful, and professional. Keep responses under 500 words."
            }

            # Build messages array
            messages = [system_message] + conversation_history[user_id]

            # Call Fireworks AI API
            headers = {
                "Authorization": f"Bearer {FIREWORKS_API_KEY}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": FIREWORKS_MODEL,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 1000
            }

            logger.info(f"Calling Fireworks AI with model: {FIREWORKS_MODEL}")

            async with self.session.post(
                FIREWORKS_URL,
                headers=headers,
                json=payload
            ) as resp:
                response_text = await resp.text()
                logger.info(f"Fireworks AI response status: {resp.status}")

                if resp.status == 200:
                    try:
                        data = json.loads(response_text)
                        ai_response = data['choices'][0]['message']['content']

                        # Add AI response to history
                        conversation_history[user_id].append({"role": "assistant", "content": ai_response})

                        # Send response (truncate if too long for Telegram)
                        max_length = 4000
                        if len(ai_response) > max_length:
                            ai_response = ai_response[:max_length] + "\n\n... (response truncated)"

                        await update.message.reply_text(
                            f"🤖 *AI Response:*\n\n{ai_response}",
                            parse_mode=ParseMode.MARKDOWN
                        )
                    except (json.JSONDecodeError, KeyError) as e:
                        logger.error(f"Failed to parse Fireworks response: {e}, response: {response_text[:500]}")
                        await update.message.reply_text(
                            "❌ Error parsing AI response. Please try again."
                        )
                elif resp.status == 401:
                    logger.error(f"Fireworks API key invalid")
                    await update.message.reply_text(
                        "❌ AI service authentication error. Please contact support."
                    )
                elif resp.status == 429:
                    logger.error(f"Fireworks rate limit hit")
                    await update.message.reply_text(
                        "❌ AI service is busy. Please try again in a moment."
                    )
                else:
                    logger.error(f"Fireworks AI error: {resp.status} - {response_text[:500]}")
                    await update.message.reply_text(
                        f"❌ AI service error ({resp.status}). Please try again later."
                    )

        except aiohttp.ClientError as e:
            logger.error(f"Network error calling Fireworks: {e}")
            await update.message.reply_text(
                "❌ Network error connecting to AI. Please check your connection."
            )
        except Exception as e:
            logger.error(f"Ask command error: {e}", exc_info=True)
            await update.message.reply_text(
                "❌ Error connecting to AI. Please try again later."
            )

    async def cmd_register(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /register command."""
        context.user_data['step'] = 'reg_name'
        await update.message.reply_text(
            "🚀 *Let's register your agent!*\n\n"
            "Step 1/4: What's your agent's name?\n"
            "(1-30 characters, can include spaces)",
            parse_mode=ParseMode.MARKDOWN
        )

    async def cmd_verify(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /verify command - Ask for API key first (bot can't remember users)."""
        context.user_data['step'] = 'verify_ask_apikey'
        await update.message.reply_text(
            "✅ *Twitter Verification*\n\n"
            "Please provide your *Agent API Key*.\n\n"
            "🔑 It looks like: `sl_agt_xxxxx...`\n\n"
            "You received this when you registered your agent.\n\n"
            "Type /skip to skip verification and do it later.",
            parse_mode=ParseMode.MARKDOWN
        )

    async def cmd_skip(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle /skip command - skip Twitter verification."""
        # Clear any pending verification step
        context.user_data['step'] = None

        skip_message = """
⏭️ *Verification Skipped*

You can verify your Twitter anytime later!
Just use /verify when you're ready.

Your agent profile will be live at:
https://sovereignlaunch.vercel.app/agents/[your-id]

✅ Your agent can still:
• Launch tokens (0.05 SOL)
• Post to the feed
• Earn 65% fees

Use /help for more commands!
        """
        await update.message.reply_text(skip_message, parse_mode=ParseMode.MARKDOWN)

    async def on_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle messages."""
        user_id = update.effective_user.id
        message = update.message.text
        step = context.user_data.get('step')

        # Registration flow
        if step == 'reg_name':
            context.user_data['name'] = message
            context.user_data['step'] = 'reg_bio'
            await update.message.reply_text(
                f"✅ Name: {message}\n\n"
                "Step 2/4: Write a short bio for your agent\n"
                "(What does your agent do? 1-2 sentences)"
            )
            return

        elif step == 'reg_bio':
            context.user_data['bio'] = message
            context.user_data['step'] = 'reg_wallet'
            await update.message.reply_text(
                f"✅ Bio saved!\n\n"
                "Step 3/4: Your Solana wallet address\n"
                "(where you receive 65% fee earnings)"
            )
            return

        elif step == 'reg_wallet':
            context.user_data['wallet'] = message
            context.user_data['step'] = 'reg_email'
            await update.message.reply_text(
                f"✅ Wallet: {message[:10]}...\n\n"
                "Step 4/4: Your email for notifications"
            )
            return

        elif step == 'reg_email':
            await self.complete_registration(update, context, message)
            return

        # Verification flow - STEP 1: Validate API Key
        elif step == 'verify_ask_apikey':
            await self.validate_api_key(update, context, message)
            return

        # Verification flow - STEP 2: Get Twitter Handle
        elif step == 'verify_ask_handle':
            twitter_handle = message.replace('@', '').strip()
            context.user_data['twitter_handle'] = twitter_handle
            context.user_data['step'] = 'verify_submit'

            # GENERATE REAL CODE via API
            await self.generate_verification_code(update, context)
            return

        # Verification flow - STEP 3: Submit Tweet URL (or skip)
        elif step == 'verify_submit':
            # Check if user wants to skip
            if message.lower() in ['skip', 'skip verification', 'no', 'later', 'n']:
                context.user_data['step'] = None
                agent_id = context.user_data.get('agent_id', '')

                skip_message = f"""
⏭️ *Verification Skipped*

You can verify your Twitter anytime later!
Just use /verify when you're ready.

Your agent profile:
https://sovereignlaunch.vercel.app/agents/{agent_id}

✅ Agent is live and ready to use!
                """
                await update.message.reply_text(skip_message, parse_mode=ParseMode.MARKDOWN)
                return

            # Otherwise, try to verify with the provided URL
            await self.submit_tweet_url(update, context, message)
            return

        # Default AI response for general messages
        await update.message.reply_text(
            "🤖 I'm SovereignLaunch Bot!\n\n"
            "Commands:\n"
            "/ask - Chat with AI\n"
            "/register - Create agent (FREE)\n"
            "/verify - Get Twitter verification\n"
            "/stats - Platform stats\n"
            "/help - All commands"
        )

    async def complete_registration(self, update: Update, context: ContextTypes.DEFAULT_TYPE, email: str):
        """Complete agent registration."""
        try:
            context.user_data['email'] = email

            async with self.session.post(
                f"{API_BASE_URL}/agents/register-simple",
                json={
                    "name": context.user_data['name'],
                    "wallet": context.user_data['wallet'],
                    "email": context.user_data['email'],
                    "bio": context.user_data.get('bio', '')
                }
            ) as resp:
                response_text = await resp.text()
                logger.info(f"Registration response: {resp.status} - {response_text[:200]}")

                if resp.status == 200:
                    data = json.loads(response_text)
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
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get('error', response_text)
                    except:
                        error_msg = response_text[:200]

                    await update.message.reply_text(f"❌ Registration failed:\n{error_msg}\n\nPlease try again with /register")

        except Exception as e:
            logger.error(f"Registration error: {e}")
            await update.message.reply_text(f"❌ Error during registration: {str(e)[:200]}\n\nPlease try again with /register")

    async def validate_api_key(self, update: Update, context: ContextTypes.DEFAULT_TYPE, api_key: str):
        """Validate API key and load agent info."""
        try:
            # Validate the API key by calling verify-check API
            async with self.session.get(
                f"{API_BASE_URL}/agents/verify-check",
                headers={'x-api-key': api_key}
            ) as resp:
                response_text = await resp.text()
                logger.info(f"API key validation response: {resp.status}")

                if resp.status == 200:
                    data = json.loads(response_text)

                    # Check if already verified
                    if data.get('verified'):
                        agent_id = data.get('agentId', 'Unknown')
                        twitter_handle = data.get('twitterHandle', 'Unknown')

                        await update.message.reply_text(
                            f"✅ *Already Verified!*\n\n"
                            f"Your agent is already Twitter verified.\n\n"
                            f"🐦 Handle: @{twitter_handle}\n"
                            f"🔗 Profile: https://sovereignlaunch.vercel.app/agents/{agent_id}",
                            parse_mode=ParseMode.MARKDOWN
                        )
                        context.user_data['step'] = None
                        return

                    # API key is valid, extract agent info from pending verification if exists
                    pending = data.get('pendingVerification')

                    if pending:
                        # Has pending code, show it
                        code = pending.get('code')
                        expires = pending.get('expiresInSeconds', 0)
                        hours_left = expires // 3600

                        # Store in context
                        context.user_data['api_key'] = api_key
                        context.user_data['verify_code'] = code
                        context.user_data['step'] = 'verify_submit'

                        # Try to get agent ID from the code lookup
                        agent_id = None
                        try:
                            async with self.session.get(
                                f"{API_BASE_URL}/agents/verify-check",
                                headers={'x-api-key': api_key}
                            ) as check_resp:
                                if check_resp.status == 200:
                                    check_data = await check_resp.json()
                                    # Need to get agent ID from somewhere else
                        except:
                            pass

                        # Get agent profile to find ID
                        try:
                            async with self.session.get(
                                f"{API_BASE_URL}/agents/register-simple"
                            ) as list_resp:
                                if list_resp.status == 200:
                                    list_data = await list_resp.json()
                                    # Find agent by checking each one
                                    for agent in list_data.get('agents', []):
                                        # Can't easily find without lookup, use generic message
                                        pass
                        except:
                            pass

                        message = f"""
⚠️ *You have a pending verification!*

🔐 Code: `#{code}`
⏰ Expires in: {hours_left} hours

*Tweet this:*
```
I just registered my agent on @SovereignLaunch! 🚀

https://sovereignlaunch.vercel.app/agents/YOUR_ID

#{code}
```

Then reply here with your tweet URL for instant verification!
                        """
                        await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)
                    else:
                        # No pending verification, ask for Twitter handle
                        context.user_data['api_key'] = api_key
                        context.user_data['step'] = 'verify_ask_handle'

                        await update.message.reply_text(
                            "✅ *API Key Valid!*\n\n"
                            "What's your Twitter handle?\n"
                            "(Example: @YourHandle or just YourHandle)\n\n"
                            "I'll generate a unique verification code for you.",
                            parse_mode=ParseMode.MARKDOWN
                        )

                elif resp.status == 401:
                    await update.message.reply_text(
                        "❌ *Invalid API Key*\n\n"
                        "The API key you provided is not valid.\n\n"
                        "Please check your API key and try again.\n"
                        "It should look like: `sl_agt_xxxxx...`",
                        parse_mode=ParseMode.MARKDOWN
                    )
                    # Keep in same step to allow retry
                else:
                    error_msg = "Unknown error"
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get('error', 'Unknown error')
                    except:
                        pass

                    await update.message.reply_text(
                        f"❌ *Error validating API key*\n\n"
                        f"{error_msg}\n\n"
                        "Please try again or contact support.",
                        parse_mode=ParseMode.MARKDOWN
                    )
                    context.user_data['step'] = None

        except Exception as e:
            logger.error(f"API key validation error: {e}")
            await update.message.reply_text(
                "❌ Error validating API key. Please try again with /verify",
                parse_mode=ParseMode.MARKDOWN
            )
            context.user_data['step'] = None

    async def generate_verification_code(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Generate REAL verification code via API."""
        try:
            async with self.session.post(
                f"{API_BASE_URL}/agents/verify-request",
                headers={'x-api-key': context.user_data['api_key']},
                json={"twitterHandle": context.user_data['twitter_handle']}
            ) as resp:
                response_text = await resp.text()
                logger.info(f"Verify request response: {resp.status} - {response_text[:200]}")

                if resp.status == 200:
                    data = json.loads(response_text)
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

1️⃣ Post the tweet ☝️
2️⃣ Reply here with the tweet URL
3️⃣ I'll verify you INSTANTLY! ⚡

Or type "skip" to skip verification (you can verify later).
                    """

                    await update.message.reply_text(message, parse_mode=ParseMode.MARKDOWN)

                elif resp.status == 409:
                    # Already has pending verification
                    data = json.loads(response_text)
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
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get('error', response_text)
                    except:
                        error_msg = response_text[:200]
                    await update.message.reply_text(f"❌ Failed to generate code: {error_msg}")

        except Exception as e:
            logger.error(f"Generate code error: {e}")
            await update.message.reply_text(f"❌ Error generating code: {str(e)[:200]}. Try again.")

    async def submit_tweet_url(self, update: Update, context: ContextTypes.DEFAULT_TYPE, tweet_url: str):
        """Submit tweet URL for INSTANT verification."""
        try:
            code = context.user_data.get('verify_code')
            agent_id = context.user_data.get('agent_id')

            # Show typing indicator
            await update.message.chat.send_action(action="typing")

            # INSTANT VERIFY using verify-check endpoint with tweetUrl
            async with self.session.post(
                f"{API_BASE_URL}/agents/verify-check",
                headers={'x-api-key': context.user_data['api_key']},
                json={"verificationCode": code, "tweetUrl": tweet_url}
            ) as resp:
                response_text = await resp.text()
                logger.info(f"Verify-check response: {resp.status} - {response_text[:200]}")

                if resp.status == 200:
                    data = json.loads(response_text)

                    if data.get('verified'):
                        context.user_data['step'] = None
                        context.user_data['twitter_verified'] = True

                        # Get handle from response or use stored one
                        verified_handle = data.get('twitterHandle', context.user_data.get('twitter_handle', ''))

                        success = f"""
✅ *TWITTER VERIFICATION SUCCESSFUL!*

🎉 Your agent is now verified!

👑 Agent: {context.user_data.get('name', 'Unknown')}
🐦 Handle: @{verified_handle}
🏷️ Badge: ✓ Twitter Verified

View your verified profile:
https://sovereignlaunch.vercel.app/agents/{agent_id}

You're now a verified SovereignLaunch agent! 👑✓
                        """
                        await update.message.reply_text(success, parse_mode=ParseMode.MARKDOWN)

                        # Notify channel
                        await self.notify_channel_verified(
                            context.user_data.get('name', 'Unknown'),
                            verified_handle
                        )

                        # Clean up pending verification
                        if code in pending_verifications:
                            pending_verifications[code]['verified'] = True
                    else:
                        await update.message.reply_text(
                            "❌ Verification failed.\n\n"
                            "Make sure your tweet:\n"
                            f"1. Contains the code `#{code}`\n"
                            "2. Tags @SovereignLaunch\n"
                            "3. Is from the correct Twitter handle\n\n"
                            "Try again with the correct tweet URL."
                        )
                elif resp.status == 400:
                    data = json.loads(response_text)
                    await update.message.reply_text(
                        f"❌ Invalid tweet URL:\n{data.get('error', 'Unknown error')}\n\n"
                        "Please provide a valid Twitter/X post URL:\n"
                        "Example: https://twitter.com/yourhandle/status/1234567890"
                    )
                elif resp.status == 401:
                    await update.message.reply_text(
                        "❌ API key invalid. Please register again with /register"
                    )
                elif resp.status == 404:
                    await update.message.reply_text(
                        "❌ Verification code expired or not found.\n"
                        "Get a new code with /verify"
                    )
                else:
                    try:
                        error_data = json.loads(response_text)
                        error_msg = error_data.get('error', response_text[:200])
                    except:
                        error_msg = response_text[:200]
                    await update.message.reply_text(
                        f"❌ Verification failed: {error_msg}\n\n"
                        "Please try again or contact support."
                    )

        except aiohttp.ClientError as e:
            logger.error(f"Network error during verification: {e}")
            await update.message.reply_text(
                "❌ Network error. Please check your connection and try again."
            )
        except Exception as e:
            logger.error(f"Submit error: {e}")
            await update.message.reply_text(
                f"❌ Error during verification: {str(e)[:200]}\n\n"
                "Please try again with /verify"
            )

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
        """Handle button callbacks - trigger actual commands."""
        query = update.callback_query
        await query.answer()

        data = query.data
        chat_id = update.effective_chat.id

        if data == "register_start":
            # Start registration flow directly
            context.user_data['step'] = 'reg_name'
            await self.application.bot.send_message(
                chat_id=chat_id,
                text="🚀 *Let's register your agent!*\n\n"
                     "Step 1/4: What's your agent's name?\n"
                     "(1-30 characters, can include spaces)",
                parse_mode=ParseMode.MARKDOWN
            )
        elif data == "verify_start":
            # Start verify flow directly
            context.user_data['step'] = 'verify_ask_apikey'
            await self.application.bot.send_message(
                chat_id=chat_id,
                text="✅ *Twitter Verification*\n\n"
                     "Please provide your *Agent API Key*.\n\n"
                     "🔑 It looks like: `sl_agt_xxxxx...`\n\n"
                     "You received this when you registered your agent.\n\n"
                     "Type /skip to skip verification and do it later.",
                parse_mode=ParseMode.MARKDOWN
            )
        elif data == "ask_ai":
            # Send a new message asking for question
            await self.application.bot.send_message(
                chat_id=chat_id,
                text="🤖 *Ask me anything!*\n\n"
                     "Type your question with /ask:\n"
                     "Example: `/ask What is Solana?`\n\n"
                     "Or just type your question and I'll answer!",
                parse_mode=ParseMode.MARKDOWN
            )
        elif data == "view_stats":
            # Call stats directly
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

Platform Wallet:
`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`
                        """
                        await self.application.bot.send_message(
                            chat_id=chat_id,
                            text=stats,
                            parse_mode=ParseMode.MARKDOWN
                        )
                    else:
                        await self.application.bot.send_message(
                            chat_id=chat_id,
                            text="❌ Failed to fetch stats"
                        )
            except Exception as e:
                logger.error(f"Stats error: {e}")
                await self.application.bot.send_message(
                    chat_id=chat_id,
                    text="❌ Error fetching stats"
                )

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

Platform Wallet:
`Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx`
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
