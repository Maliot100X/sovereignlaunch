import { NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(
  request: Request,
  { params }: { params: { mint: string } }
) {
  try {
    const { mint } = params;

    if (!mint) {
      return NextResponse.json(
        { error: 'Token mint address required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BAGS_API_URL}/token/${mint}`, {
      headers: {
        'x-api-key': BAGS_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Token not found' },
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
      token: data,
      mint,
      links: {
        solscan: `https://solscan.io/token/${mint}`,
        dexscreener: `https://dexscreener.com/solana/${mint}`,
        photon: `https://photon-sol.tinyastro.io/en/lp/${mint}`
      }
    });

  } catch (error) {
    console.error('[BAGS Token] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token details' },
      { status: 500 }
    );
  }
}
