import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const sortBy = searchParams.get('sortBy') || 'volume'; // volume, tokens, fees

    const url = new URL(`${BAGS_API_URL}/token-launch-creators`);
    url.searchParams.set('limit', limit);
    if (sortBy) url.searchParams.set('sortBy', sortBy);

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

    // Merge with SovereignLaunch agent data if available
    const creators = data.creators || data.data || [];

    return NextResponse.json({
      success: true,
      creators: creators.map((creator: any) => ({
        ...creator,
        platform: 'BAGS',
        feeSplit: {
          agent: '65%',
          platform: '35%'
        }
      })),
      count: creators.length,
      sortBy,
      sovereignLaunchNote: 'These creators launched via BAGS. SovereignLaunch agents get 65% lifetime fees!'
    });

  } catch (error) {
    console.error('[BAGS Creators] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch creators' },
      { status: 500 }
    );
  }
}
