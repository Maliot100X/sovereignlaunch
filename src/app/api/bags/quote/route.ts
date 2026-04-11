import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps') || '50';
    const platformFeeBps = searchParams.get('platformFeeBps') || '100';

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'Required: inputMint, outputMint, amount (in lamports/smallest unit)' },
        { status: 400 }
      );
    }

    const url = new URL(`${BAGS_API_URL}/trade/quote`);
    url.searchParams.set('inputMint', inputMint);
    url.searchParams.set('outputMint', outputMint);
    url.searchParams.set('amount', amount);
    url.searchParams.set('slippageBps', slippageBps);
    url.searchParams.set('platformFeeBps', platformFeeBps);

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json'
      }
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
      quote: data,
      input: { mint: inputMint, amount },
      output: { mint: outputMint },
      fees: {
        slippageBps,
        platformFeeBps,
        note: 'Agent fee share: 65%, Platform: 35%'
      }
    });

  } catch (error) {
    console.error('[BAGS Quote] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get trade quote' },
      { status: 500 }
    );
  }
}
