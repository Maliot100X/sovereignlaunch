import { NextResponse } from 'next/server';
import { telegramBot } from '@/lib/telegram-server';

let botStarted = false;

export async function POST() {
  try {
    if (botStarted) {
      return NextResponse.json({
        success: true,
        message: 'Bot already running'
      });
    }

    await telegramBot.start();
    botStarted = true;

    return NextResponse.json({
      success: true,
      message: 'Telegram bot started successfully'
    });
  } catch (error) {
    console.error('Error starting Telegram bot:', error);
    return NextResponse.json(
      { error: 'Failed to start Telegram bot' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: botStarted ? 'running' : 'stopped',
    botTokenConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
    channelIdConfigured: !!process.env.TELEGRAM_CHANNEL_ID
  });
}
