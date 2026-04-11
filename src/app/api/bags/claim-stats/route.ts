import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenMint = searchParams.get('tokenMint');

    let url = `${BAGS_API_URL}/token-claim-stats`;
    if (tokenMint) {
      url += `?tokenMint=${tokenMint}`;
    }

    const response = await fetch(url, {
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
      claimStats: data,
      tokenMint: tokenMint || 'all',
      info: {
        agentShare: '65%',
        platformShare: '35%',
        claiming: 'Use POST /api/agents/fees/claim to claim fees'
      }
    });

  } catch (error) {
    console.error('[BAGS Claim Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch claim stats' },
      { status: 500 }
    );
  }
}
