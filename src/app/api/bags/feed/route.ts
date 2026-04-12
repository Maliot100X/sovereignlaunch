import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://public-api-v2.bags.fm/api/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || '';

// Cache duration in seconds
const CACHE_DURATION = 120;

// Fetch token market data from Bags pools endpoint
async function fetchTokenMarketData(mint: string): Promise<any> {
  try {
    // Check cache first
    const cached = await redis.get(`bags:token:${mint}:market`);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // Try to get pool data from Bags API
    const poolUrl = `${BAGS_API_URL}/solana/bags/pools/token-mint?tokenMint=${mint}`;
    
    const poolResponse = await fetch(poolUrl, {
      headers: {
        'X-API-Key': BAGS_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (poolResponse.ok) {
      const poolData = await poolResponse.json();
      
      if (poolData.success && poolData.response) {
        const pool = poolData.response;
        
        // Check if pool has migrated (has dammV2PoolKey)
        const hasMigrated = !!pool.dammV2PoolKey;
        
        const marketData = {
          price: 0, // Can't get from Bags API alone
          marketCap: 0,
          volume24h: 0,
          holders: 0,
          priceChange24h: 0,
          liquidity: 0,
          status: hasMigrated ? 'Live' : 'Pre-Grad',
          poolAddress: pool.dbcPoolKey || null,
          dammV2PoolKey: pool.dammV2PoolKey || null
        };

        // Cache for 5 minutes
        await redis.setex(`bags:token:${mint}:market`, 300, JSON.stringify(marketData));
        return marketData;
      }
    }

    return null;
  } catch (error) {
    console.error(`[Bags Pool] Error for ${mint}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const skipCache = searchParams.get('refresh') === 'true';
    const requireMarketData = searchParams.get('requireMarket') !== 'false';

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

    // Enrich tokens with pool data
    const enrichedTokens = await Promise.all(
      allTokens.slice(0, limit * 2).map(async (token: any) => {
        const mint = String(token.tokenMint || token.address || token.mint || '');
        
        if (!mint) return null;

        // Fetch pool data from Bags
        const marketData = await fetchTokenMarketData(mint);

        // Skip tokens with no market data if requireMarketData is true
        if (requireMarketData && !marketData) {
          return null;
        }

        return {
          tokenMint: mint,
          name: String(token.name || 'Unknown Token'),
          symbol: String(token.symbol || '???'),
          price: marketData?.price || Number(token.price || token.currentPrice || 0),
          marketCap: marketData?.marketCap || Number(token.marketCap || token.market_cap || token.fdv || 0),
          volume24h: marketData?.volume24h || Number(token.volume24h || token.volume_24h || token.volume || 0),
          holders: marketData?.holders || Number(token.holders || token.holderCount || 0),
          image: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
          imageUrl: String(token.imageUrl || token.image || token.logoURI || '/placeholder-token.png'),
          status: marketData?.status || String(token.status || 'PRE_LAUNCH'),
          creator: token.creator || { name: String(token.creatorName || 'Unknown') },
          launchedAt: String(token.launchedAt || token.createdAt || token.timestamp || new Date().toISOString()),
          priceChange24h: marketData?.priceChange24h || Number(token.priceChange24h || token.price_change_24h || 0),
          liquidity: marketData?.liquidity || Number(token.liquidity || 0),
          address: mint,
          poolAddress: marketData?.poolAddress || token.dbcPoolKey || null,
          dammV2PoolKey: marketData?.dammV2PoolKey || token.dammV2PoolKey || null
        };
      })
    );

    // Filter out nulls and limit
    const validTokens = enrichedTokens.filter(Boolean).slice(0, limit);

    // Calculate totals
    const totals = {
      marketCap: validTokens.reduce((sum, t) => sum + (t.marketCap || 0), 0),
      volume24h: validTokens.reduce((sum, t) => sum + (t.volume24h || 0), 0),
      tvl: validTokens.reduce((sum, t) => sum + (t.liquidity || 0), 0)
    };

    const result = {
      success: true,
      tokens: validTokens,
      totals,
      pagination: {
        page: 1,
        limit,
        total: validTokens.length,
        hasMore: allTokens.length > limit
      },
      source: 'bags-api-v2',
      cachedAt: Math.floor(Date.now() / 1000)
    };

    // Cache the result
    await redis.setex('bags:feed:cache', CACHE_DURATION, JSON.stringify(result));

    return NextResponse.json(result);

  } catch (error) {
    console.error('[BAGS Feed] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch token feed', details: String(error) },
      { status: 500 }
    );
  }
}
