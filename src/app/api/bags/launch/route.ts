import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { telegramBot } from '@/lib/telegram-server';
import type { TokenLaunchParams } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: TokenLaunchParams = await request.json();

    // Validate required fields
    if (!body.name || !body.symbol || !body.creatorWallet) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, creatorWallet' },
        { status: 400 }
      );
    }

    // Launch token via BAGS API
    const response = await bagsApi.launchToken(body);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to launch token' },
        { status: 400 }
      );
    }

    // Send Telegram notification
    if (response.tokenAddress) {
      await telegramBot.notifyLaunch(
        response.tokenAddress,
        body.symbol,
        body.name,
        body.creatorWallet
      );
    }

    return NextResponse.json({
      success: true,
      tokenAddress: response.tokenAddress,
      transactionSignature: response.transactionSignature,
      message: 'Token launched successfully'
    });
  } catch (error) {
    console.error('Error in /api/bags/launch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
