import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://public-api-v2.bags.fm/api/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || 'bags_prod_YhTVMoennloNU06kSEDqQ8g_Bdd7_5g7RdcMT1EBr4o';

// Cache duration in seconds (2 minutes for feed, 5 minutes for individual tokens)
const CACHE_DURATION = 120;

// Fetch individual token data with market info
async function fetchTokenMarketData(mint: string): Promise<any> {
  try {
    // Check cache first
    const cached = await redis.get(`bags:token:${mint}:market`);
    if (cached) {
      return JSON.parse(cached as string);
    }

    const url = `${BAGS_API_URL}/token/${mint}`;
    const response = await fetch(url, {
      headers: {
        'X-API-Key': BAGS_API_KEY,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const token = data.token || data.data || data;

    const marketData = {
      price: Number(token.price || token.currentPrice || token.priceUsd || 0),
      marketCap: Number(token.marketCap || token.market_cap || token.fdv || 0),
      volume24h: Number(token.volume24h || token.volume_24h || token.volume24hUsd || token.volume || 0),
      holders: Number(token.holders || token.holderCount || 0),
      priceChange24h: Number(token.priceChange24h || token.price_change_24h || token.change24h || 0),
      liquidity: Number(token.liquidity || token.liquidityUsd || 0),
      status: token.status || 'Live'
    };

    // Cache market data for 5 minutes
    await redis.setex(`bags:token:${mint}:market`, 300, JSON.stringify(marketData));

    return marketData;
  } catch (error) {
    console.error(`[BAGS] Error fetching market data for ${mint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skipCache = searchParams.get('refresh') === 'true';
    const requireMarketData = searchParams.get('requireMarket') !== 'false'; // Default true

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

    // Fetch feed from BAGS API
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

    // Get raw tokens from feed
    const allTokens = (data.tokens || data.data || data.response || []);

    // Enrich tokens with real market data
    const enrichedTokens = await Promise.all(
      allTokens.slice(0, limit * 2).map(async (token: any) => {
        const mint = String(token.tokenMint || token.address || token.mint || '');
        if (!mint) return null;

        // Fetch real market data
        const marketData = await fetchTokenMarketData(mint);

        // Skip tokens with no market data if requireMarketData is true
        if (requireMarketData && marketData && marketData.volume24h === 0 && marketData.marketCap === 0) {
          return null;
        }

        return {
          tokenMint: mint,
          name: String(token.name || 'Unknown Token'),
          symbol: String(token.symbol || '???'),
          price: marketData?.price || Number(token.price || token.currentPrice || 0),
          marketCap: marketData?.marketCap || Number(token.marketCap || token.market_cap || 0),
          volume24h: marketData?.volume24h || Number(token.volume24h || token.volume_24h || token.volume || 0),
          holders: marketData?.holders || Number(token.holders || token.holderCount || 0),
          image: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
          imageUrl: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
          status: marketData?.status || String(token.status || 'Live'),
          creator: token.creator || { name: String(token.creatorName || 'Unknown') },
          launchedAt: String(token.launchedAt || token.createdAt || token.timestamp || new Date().toISOString()),
          priceChange24h: marketData?.priceChange24h || Number(token.priceChange24h || token.price_change_24h || 0),
          liquidity: marketData?.liquidity || Number(token.liquidity || 0),
          address: mint
        };
      })
    );

    // Filter out nulls and apply limit
    const tokens = enrichedTokens
      .filter(Boolean)
      .slice(0, limit);

    // Calculate totals
    const totalVolume = tokens.reduce((sum, t) => sum + (t.volume24h || 0), 0);
    const totalMarketCap = tokens.reduce((sum, t) => sum + (t.marketCap || 0), 0);

    const result = {
      success: true,
      tokens,
      totals: {
        volume24h: totalVolume,
        marketCap: totalMarketCap,
        count: tokens.length
      },
      pagination: {
        cursor: data.cursor || data.nextCursor || null,
        hasMore: data.hasMore || false
      },
      source: 'bags-api',
      cachedAt: Math.floor(Date.now() / 1000),
      note: 'Market data (price/volume) fetched from BAGS token endpoints'
    };

    // Cache in Redis
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
