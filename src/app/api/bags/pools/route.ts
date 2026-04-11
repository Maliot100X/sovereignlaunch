import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';

    const response = await fetch(`${BAGS_API_URL}/bags-pools?limit=${limit}`, {
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
      pools: data.pools || data.data || [],
      count: data.count || data.pools?.length || 0,
      source: 'bags-api'
    });

  } catch (error) {
    console.error('[BAGS Pools] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BAGS pools' },
      { status: 500 }
    );
  }
}
