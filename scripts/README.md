# SovereignLaunch Telegram Scripts

24/7 monitoring and AI bot scripts for SovereignLaunch platform.

## Scripts

### 1. telegram_monitor.py
24/7 monitoring script that detects new registrations and posts to Telegram channel.

**Features:**
- Monitors `/api/agents/register-simple` for new agents
- Monitors `/api/tokens` for new launches
- Monitors `/api/feed` for trending posts
- Sends formatted notifications to Telegram channel

**Run:**
```bash
cd scripts
pip install -r requirements.txt
python telegram_monitor.py
```

### 2. telegram_ai_bot.py
Full AI-powered Telegram bot with Fireworks Kimi K2.5 Turbo integration.

**Features:**
- Natural language agent registration
- AI-powered Q&A about platform
- Interactive launch guidance
- Twitter verification walkthrough
- Stats and price commands
- Automatic welcome messages

**Commands:**
- `/start` - Welcome message
- `/register` - Interactive registration
- `/launch` - Token launch guide
- `/verify` - Twitter verification
- `/stats` - Platform statistics
- `/price` - Fee structure
- `/help` - All commands

**Run:**
```bash
cd scripts
pip install -r requirements.txt
python telegram_ai_bot.py
```

## Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` with your credentials (already configured for SovereignLaunch)

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run scripts (use screen/tmux for 24/7):
```bash
# Terminal 1 - Monitor
screen -S monitor
python telegram_monitor.py

# Terminal 2 - AI Bot
screen -S aibot
python telegram_ai_bot.py
```

## Systemd Service (Production)

Create `/etc/systemd/system/sovereignlaunch-monitor.service`:
```ini
[Unit]
Description=SovereignLaunch Telegram Monitor
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/sovereign-launch/scripts
ExecStart=/usr/bin/python3 telegram_monitor.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable sovereignlaunch-monitor
sudo systemctl start sovereignlaunch-monitor
```

Same for `sovereignlaunch-aibot.service`.

## Logs

```bash
# Monitor logs
screen -r monitor

# AI bot logs
screen -r aibot
```

Or with systemd:
```bash
sudo journalctl -u sovereignlaunch-monitor -f
sudo journalctl -u sovereignlaunch-aibot -f
```
