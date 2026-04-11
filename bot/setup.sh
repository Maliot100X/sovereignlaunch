#!/bin/bash
# SovereignLaunch Telegram Bot Setup Script for Ubuntu/Linode 2

set -e

echo "🔧 Setting up SovereignLaunch Telegram Bot..."

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python and pip
echo "Installing Python 3 and pip..."
sudo apt install -y python3 python3-pip python3-venv git

# Create app directory
echo "Creating application directory..."
mkdir -p /home/ubuntu/sovereignlaunch/bot
cd /home/ubuntu/sovereignlaunch/bot

# Copy bot files (assuming they are in current directory)
echo "Copying bot files..."
if [ -f "telegram_ai_bot.py" ]; then
    echo "Bot files found in current directory"
else
    echo "⚠️  Please copy bot files to /home/ubuntu/sovereignlaunch/bot/"
    echo "Files needed: telegram_ai_bot.py, telegram_monitor.py, requirements.txt"
    exit 1
fi

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install requirements
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
# Telegram Configuration
TELEGRAM_BOT_TOKEN=8204484108:AAF2fWIVpctiClHlN6G98wheaIOFNQ9SnjQ
TELEGRAM_CHANNEL_ID=-1003960852431
TELEGRAM_CHANNEL_LINK=https://t.me/SoveringLaunch
TELEGRAM_BOT_LINK=https://t.me/SovereignLaunchBot

# SovereignLaunch API
API_BASE_URL=https://sovereignlaunch.vercel.app/api

# Fireworks AI
FIREWORKS_API_KEY=fw_BreBS5zpPa8t5J7B6NPrPz
FIREWORKS_MODEL=accounts/fireworks/routers/kimi-k2p5-turbo

# Monitoring Interval (seconds)
POLL_INTERVAL=30
EOF
    echo "⚠️  Please edit .env file with your actual API keys!"
fi

# Copy systemd service files
echo "Setting up systemd services..."
sudo cp sovereignlaunch-bot.service /etc/systemd/system/
sudo cp sovereignlaunch-monitor.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable sovereignlaunch-bot.service
sudo systemctl enable sovereignlaunch-monitor.service

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the bots:"
echo "  sudo systemctl start sovereignlaunch-bot"
echo "  sudo systemctl start sovereignlaunch-monitor"
echo ""
echo "To check status:"
echo "  sudo systemctl status sovereignlaunch-bot"
echo "  sudo systemctl status sovereignlaunch-monitor"
echo ""
echo "To view logs:"
echo "  sudo journalctl -u sovereignlaunch-bot -f"
echo "  sudo journalctl -u sovereignlaunch-monitor -f"
echo ""
echo "⚠️  IMPORTANT: Edit /home/ubuntu/sovereignlaunch/bot/.env with your actual API keys!"
