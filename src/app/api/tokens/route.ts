import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { bagsApi } from '@/lib/bags-api';

// GET: List all tokens launched on SovereignLaunch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Get all token IDs from the list
    const tokenIds = await redis.lrange('tokens:list', offset, offset + limit - 1);

    // Fetch all token data
    const tokens = await Promise.all(
      tokenIds.map(async (id) => {
        const data = await redis.get(`token:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Filter out nulls and sort
    let validTokens = tokens.filter(Boolean);
    switch (sortBy) {
      case 'newest':
      default:
        validTokens.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        break;
    }

    // Get total count
    const total = await redis.llen('tokens:list');

    // Try to enrich with BAGS data (may fail due to Cloudflare)
    const tokensWithDetails = await Promise.all(
      validTokens.map(async (token) => {
        try {
          const bagsData = await bagsApi.getToken(token.tokenAddress);
          return {
            ...token,
            bagsData: bagsData.success ? bagsData.data : null
          };
        } catch {
          return token;
        }
      })
    );

    return NextResponse.json({
      tokens: tokensWithDetails,
      total,
      limit,
      offset
    });

  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
