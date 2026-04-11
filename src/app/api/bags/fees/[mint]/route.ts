import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!mint) {
      return NextResponse.json(
        { error: 'Token mint address required' },
        { status: 400 }
      );
    }

    // Build URL with optional wallet param
    const url = new URL(`${BAGS_API_URL}/fee-share/wallet`);
    url.searchParams.set('tokenMint', mint);
    if (wallet) url.searchParams.set('wallet', wallet);

    const response = await fetch(url.toString(), {
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'No fee share found for this token' },
          { status: 404 }
        );
      }
      const error = await response.text();
      return NextResponse.json(
        { error: 'BAGS API error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      tokenMint: mint,
      wallet: wallet || 'platform',
      feeShare: data,
      feeSplit: {
        agent: '65%',
        platform: '35%',
        note: 'Fees are distributed automatically per BAGS protocol'
      }
    });

  } catch (error) {
    console.error('[BAGS Fees] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fee share data' },
      { status: 500 }
    );
  }
}
