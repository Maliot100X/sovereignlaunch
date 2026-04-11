import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol = true,
      feeAccount
    } = body;

    if (!quoteResponse || !userPublicKey) {
      return NextResponse.json(
        { error: 'Required: quoteResponse (from /api/bags/quote), userPublicKey' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BAGS_API_URL}/swap/create-tx`, {
      method: 'POST',
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol,
        feeAccount
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'BAGS API error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      swapTransaction: data.swapTransaction || data.transaction,
      lastValidBlockHeight: data.lastValidBlockHeight,
      prioritizationFeeLamports: data.prioritizationFeeLamports,
      instructions: [
        '1. Sign the transaction with your wallet',
        '2. Send to Solana: solana.sendTransaction(signedTx)',
        '3. Or use BAGS API to submit'
      ]
    });

  } catch (error) {
    console.error('[BAGS Swap] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create swap transaction' },
      { status: 500 }
    );
  }
}
