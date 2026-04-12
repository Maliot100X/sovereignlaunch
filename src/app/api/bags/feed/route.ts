import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { Connection, PublicKey } from '@solana/web3.js';
import DLMM from '@meteora-ag/dlmm';

const BAGS_API_URL = process.env.BAGS_API_URL || 'https://public-api-v2.bags.fm/api/v1';
const BAGS_API_KEY = process.env.BAGS_API_KEY || 'bags_prod_YhTVMoennloNU06kSEDqQ8g_Bdd7_5g7RdcMT1EBr4o';
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Cache duration in seconds
const CACHE_DURATION = 120;

// Solana connection
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Fetch token market data from Meteora DLMM pools
async function fetchTokenMarketData(mint: string, poolAddress?: string): Promise<any> {
  try {
    // Check cache first
    const cached = await redis.get(`bags:token:${mint}:market`);
    if (cached) {
      return JSON.parse(cached as string);
    }

    // If we have a pool address, fetch from Meteora directly
    if (poolAddress) {
      try {
        // Load DLMM pool
        const pool = await DLMM.create(connection, new PublicKey(poolAddress));
        
        // Get pool info
        const tokenX = pool.tokenX;
        const tokenY = pool.tokenY;
        
        // Get pool reserves
        const reserveX = await connection.getTokenAccountBalance(pool.lbPair.reserveX);
        const reserveY = await connection.getTokenAccountBalance(pool.lbPair.reserveY);
        
        // Calculate price
        const reserveXValue = Number(reserveX.value.amount) / Math.pow(10, tokenX.decimal);
        const reserveYValue = Number(reserveY.value.amount) / Math.pow(10, tokenY.decimal);
        
        // Price = reserveY / reserveX (tokenY per tokenX)
        const price = reserveXValue > 0 ? reserveYValue / reserveXValue : 0;
        
        // Get active bin price (more accurate)
        const activeBin = await pool.getActiveBin();
        const binPrice = activeBin.price;
        
        // Determine which token is our target
        const isTokenX = tokenX.mint.toBase58() === mint;
        const tokenPrice = isTokenX ? binPrice : 1 / binPrice;
        
        // Calculate TVL (rough estimate)
        const tvl = reserveXValue + (reserveYValue * (isTokenX ? 1/binPrice : binPrice));
        
        const marketData = {
          price: tokenPrice,
          marketCap: 0, // Need total supply to calculate
          volume24h: 0, // Need historical data
          holders: 0, // Not available from pool
          priceChange24h: 0,
          liquidity: tvl,
          status: 'Live',
          poolAddress: poolAddress
        };

        // Cache for 5 minutes
        await redis.setex(`bags:token:${mint}:market`, 300, JSON.stringify(marketData));
        return marketData;
        
      } catch (poolError) {
        console.error(`[Meteora] Pool fetch error for ${mint}:`, poolError);
      }
    }

    // Fallback: Try to find pool by mint
    try {
      // Search for pools containing this mint
      // This is a simplified approach - in production, you'd query a pool index
      const pools = await DLMM.getLbPairs(connection);
      
      for (const pool of pools) {
        const poolMintX = pool.account.tokenXMint.toBase58();
        const poolMintY = pool.account.tokenYMint.toBase58();
        
        if (poolMintX === mint || poolMintY === mint) {
          // Found a pool with this token
          return await fetchTokenMarketData(mint, pool.publicKey.toBase58());
        }
      }
    } catch (searchError) {
      console.error(`[Meteora] Pool search error for ${mint}:`, searchError);
    }

    return null;
  } catch (error) {
    console.error(`[Meteora] Error fetching market data for ${mint}:`, error);
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

    // Enrich tokens with real market data from Meteora
    const enrichedTokens = await Promise.all(
      allTokens.slice(0, limit * 2).map(async (token: any) => {
        const mint = String(token.tokenMint || token.address || token.mint || '');
        const poolAddress = token.dbcPoolKey || token.poolAddress;
        
        if (!mint) return null;

        // Fetch real market data from Meteora
        const marketData = await fetchTokenMarketData(mint, poolAddress);

        // Skip tokens with no market data if requireMarketData is true
        if (requireMarketData && marketData && marketData.volume24h === 0 && marketData.marketCap === 0) {
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
          status: marketData?.status || String(token.status || 'Live'),
          creator: token.creator || { name: String(token.creatorName || 'Unknown') },
          launchedAt: String(token.launchedAt || token.createdAt || token.timestamp || new Date().toISOString()),
          priceChange24h: marketData?.priceChange24h || Number(token.priceChange24h || token.price_change_24h || 0),
          liquidity: marketData?.liquidity || Number(token.liquidity || 0),
          address: mint,
          poolAddress: poolAddress
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
      source: 'bags-api-meteora',
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
