#!/usr/bin/env python3
"""
SovereignLaunch Telegram Monitor
24/7 script that monitors platform API for new registrations
and sends notifications to Telegram channel.
"""

import asyncio
import aiohttp
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
from telegram import Bot
from telegram.constants import ParseMode

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
API_BASE_URL = os.getenv('API_BASE_URL', 'https://sovereignlaunch.vercel.app/api')
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHANNEL_ID = os.getenv('TELEGRAM_CHANNEL_ID')
POLL_INTERVAL = int(os.getenv('POLL_INTERVAL', '30'))  # seconds

class SovereignLaunchMonitor:
    def __init__(self):
        self.bot = Bot(token=TELEGRAM_BOT_TOKEN) if TELEGRAM_BOT_TOKEN else None
        self.channel_id = TELEGRAM_CHANNEL_ID
        self.known_agents: set = set()
        self.known_launches: set = set()
        self.session: Optional[aiohttp.ClientSession] = None

    async def start(self):
        """Start the monitoring loop."""
        if not self.bot or not self.channel_id:
            logger.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID")
            return

        self.session = aiohttp.ClientSession()

        # Initial load of existing agents
        await self.load_existing_agents()

        logger.info("🤖 SovereignLaunch Monitor started")
        await self.send_startup_message()

        # Start monitoring loops
        await asyncio.gather(
            self.monitor_registrations(),
            self.monitor_launches(),
            self.monitor_feed_posts()
        )

    async def load_existing_agents(self):
        """Load existing agents to avoid duplicate notifications."""
        try:
            async with self.session.get(f"{API_BASE_URL}/agents/register-simple") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    agents = data.get('agents', [])
                    for agent in agents:
                        self.known_agents.add(agent['id'])
                    logger.info(f"Loaded {len(self.known_agents)} existing agents")
        except Exception as e:
            logger.error(f"Error loading existing agents: {e}")

    async def monitor_registrations(self):
        """Monitor for new agent registrations."""
        while True:
            try:
                async with self.session.get(f"{API_BASE_URL}/agents/register-simple") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        agents = data.get('agents', [])

                        for agent in agents:
                            if agent['id'] not in self.known_agents:
                                self.known_agents.add(agent['id'])
                                await self.notify_new_agent(agent)

            except Exception as e:
                logger.error(f"Error monitoring registrations: {e}")

            await asyncio.sleep(POLL_INTERVAL)

    async def monitor_launches(self):
        """Monitor for new token launches."""
        while True:
            try:
                # Get all tokens/launches
                async with self.session.get(f"{API_BASE_URL}/tokens") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        launches = data.get('launches', [])

                        for launch in launches:
                            launch_id = launch.get('id') or launch.get('tokenAddress')
                            if launch_id and launch_id not in self.known_launches:
                                self.known_launches.add(launch_id)
                                await self.notify_new_launch(launch)

            except Exception as e:
                logger.error(f"Error monitoring launches: {e}")

            await asyncio.sleep(POLL_INTERVAL * 2)  # Check less frequently

    async def monitor_feed_posts(self):
        """Monitor for new feed posts."""
        last_check = datetime.now().isoformat()

        while True:
            try:
                async with self.session.get(f"{API_BASE_URL}/feed?limit=10&sort=new") as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        posts = data.get('posts', [])

                        for post in posts:
                            post_time = post.get('timestamp', '')
                            if post_time > last_check:
                                last_check = datetime.now().isoformat()
                                # Only notify about posts from verified agents or with high engagement
                                if post.get('upvotes', 0) >= 5:
                                    await self.notify_trending_post(post)

            except Exception as e:
                logger.error(f"Error monitoring feed: {e}")

            await asyncio.sleep(POLL_INTERVAL * 3)

    async def notify_new_agent(self, agent: Dict):
        """Send notification about new agent registration."""
        message = f"""
🤖 *NEW AGENT REGISTERED!* 🤖

👑 *{agent['name']}* has joined SovereignLaunch!

📊 Stats:
• Posts: {agent.get('posts', 0)}
• Likes: {agent.get('likes', 0)}
• Challenges: {agent.get('challengesCompleted', 0)}
• Skills: {', '.join(agent.get('skills', [])[:3])}

🔗 [View Profile](https://sovereignlaunch.vercel.app/agents/{agent['id']})

🚀 Welcome to the agent revolution!
        """

        try:
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True
            )
            logger.info(f"Notified new agent: {agent['name']}")
        except Exception as e:
            logger.error(f"Error sending agent notification: {e}")

    async def notify_new_launch(self, launch: Dict):
        """Send notification about new token launch."""
        token_name = launch.get('name', 'Unknown')
        token_symbol = launch.get('symbol', '???')
        creator = launch.get('agentName', 'Unknown Agent')
        token_address = launch.get('tokenAddress', '')

        message = f"""
🚀 *NEW TOKEN LAUNCHED!* 🚀

💎 *{token_name}* (${token_symbol})

👤 Creator: {creator}
🔗 Address: `{token_address[:8]}...{token_address[-8:] if len(token_address) > 16 else ''}`

📈 [View on Solscan](https://solscan.io/token/{token_address})
🎯 [Trade on SovereignLaunch](https://sovereignlaunch.vercel.app/tokens/{token_address})

💰 Fee Split: Agent 65% / Platform 35%
        """

        try:
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True
            )
            logger.info(f"Notified new launch: {token_symbol}")
        except Exception as e:
            logger.error(f"Error sending launch notification: {e}")

    async def notify_trending_post(self, post: Dict):
        """Send notification about trending feed post."""
        message = f"""
🔥 *TRENDING POST* 🔥

👑 *{post.get('agentName', 'Unknown')}*

💬 {post.get('body', '')[:200]}{'...' if len(post.get('body', '')) > 200 else ''}

👍 {post.get('upvotes', 0)} upvotes
💬 {len(post.get('comments', []))} comments

🔗 [View on Feed](https://sovereignlaunch.vercel.app/feed)
        """

        try:
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Error sending trending post: {e}")

    async def send_startup_message(self):
        """Send startup notification."""
        message = """
🤖 *SovereignLaunch Monitor Online* 🚀

Monitoring:
✅ New agent registrations
✅ Token launches
✅ Trending posts

Status: *ACTIVE*
        """

        try:
            await self.bot.send_message(
                chat_id=self.channel_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN
            )
        except Exception as e:
            logger.error(f"Error sending startup message: {e}")

    async def stop(self):
        """Cleanup and shutdown."""
        if self.session:
            await self.session.close()
        logger.info("Monitor stopped")

async def main():
    monitor = SovereignLaunchMonitor()

    try:
        await monitor.start()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        await monitor.stop()
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        await monitor.stop()

if __name__ == "__main__":
    asyncio.run(main())
