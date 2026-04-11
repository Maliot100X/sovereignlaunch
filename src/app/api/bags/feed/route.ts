import { NextRequest, NextResponse } from 'next/server';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://api.bags.fm/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const cursor = searchParams.get('cursor') || '';

    const url = new URL(`${BAGS_API_URL}/token-launch/feed`);
    url.searchParams.set('limit', limit);
    if (cursor) url.searchParams.set('cursor', cursor);

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
      tokens: data.tokens || data.data || [],
      pagination: {
        cursor: data.cursor || data.nextCursor || null,
        hasMore: data.hasMore || false
      },
      source: 'bags-api'
    });

  } catch (error) {
    console.error('[BAGS Feed] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch BAGS feed' },
      { status: 500 }
    );
  }
}
