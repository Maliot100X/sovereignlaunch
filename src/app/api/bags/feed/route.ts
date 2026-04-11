import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://public-api-v2.bags.fm/api/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || 'bags_prod_YhTVMoennloNU06kSEDqQ8g_Bdd7_5g7RdcMT1EBr4o';

// Cache duration in seconds (1 minute)
const CACHE_DURATION = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skipCache = searchParams.get('refresh') === 'true';

    // Try to get cached data first
    if (!skipCache) {
      const cached = await redis.get('bags:feed:cache');
      if (cached) {
        const parsed = JSON.parse(cached as string);
        return NextResponse.json({
          ...parsed,
          cached: true,
          cacheAge: Math.floor(Date.now() / 1000) - (parsed.cachedAt || 0)
        });
      }
    }

    // Note: BAGS API doesn't support limit parameter, fetch all and slice locally
    const url = `${BAGS_API_URL}/token-launch/feed`;

    const response = await fetch(url, {
      headers: {
        'X-API-Key': BAGS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: 'BAGS API error', details: error },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform to our format and apply limit locally
    // BAGS API returns data in data.response array
    const allTokens = (data.tokens || data.data || data.response || []);
    const tokens = allTokens.slice(0, limit).map((token: any) => ({
      tokenMint: String(token.tokenMint || token.address || token.mint || ''),
      name: String(token.name || 'Unknown Token'),
      symbol: String(token.symbol || '???'),
      price: Number(token.price || token.currentPrice || 0),
      marketCap: Number(token.marketCap || token.market_cap || 0),
      volume24h: Number(token.volume24h || token.volume_24h || token.volume || 0),
      holders: Number(token.holders || token.holderCount || 0),
      image: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
      imageUrl: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
      status: String(token.status || 'Live'),
      creator: token.creator || { name: String(token.creatorName || 'Unknown') },
      launchedAt: String(token.launchedAt || token.createdAt || token.timestamp || new Date().toISOString()),
      priceChange24h: Number(token.priceChange24h || token.price_change_24h || 0),
      address: String(token.tokenMint || token.address || token.mint || '')
    }));

    const result = {
      success: true,
      tokens,
      pagination: {
        cursor: data.cursor || data.nextCursor || null,
        hasMore: data.hasMore || false
      },
      source: 'bags-api',
      cachedAt: Math.floor(Date.now() / 1000)
    };

    // Cache in Redis for 60 seconds
    await redis.setex('bags:feed:cache', CACHE_DURATION, JSON.stringify(result));

    return NextResponse.json(result);

  } catch (error) {
    console.error('[BAGS Feed] Error:', error);

    // Try to serve stale cache if available
    const staleCache = await redis.get('bags:feed:cache');
    if (staleCache) {
      const parsed = JSON.parse(staleCache as string);
      return NextResponse.json({
        ...parsed,
        stale: true,
        error: 'Serving cached data due to API error'
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch BAGS feed', tokens: [] },
      { status: 500 }
    );
  }
}
