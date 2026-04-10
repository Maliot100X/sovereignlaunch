import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { telegramBot } from '@/lib/telegram-server';
import type { TradeParams } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body: TradeParams = await request.json();

    // Validate required fields
    if (!body.tokenAddress || !body.amount || !body.walletAddress || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenAddress, amount, walletAddress, type' },
        { status: 400 }
      );
    }

    if (body.type !== 'buy' && body.type !== 'sell') {
      return NextResponse.json(
        { error: 'Invalid trade type. Must be "buy" or "sell"' },
        { status: 400 }
      );
    }

    // Execute trade via BAGS API
    const response = await bagsApi.executeTrade(body);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to execute trade' },
        { status: 400 }
      );
    }

    // Send Telegram notification
    await telegramBot.notifyTrade(
      body.tokenAddress.slice(0, 6),
      body.type,
      body.amount,
      response.price || '0'
    );

    return NextResponse.json({
      success: true,
      transactionSignature: response.transactionSignature,
      amountReceived: response.amountReceived,
      price: response.price,
      message: `Trade executed successfully`
    });
  } catch (error) {
    console.error('Error in /api/bags/trade:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
