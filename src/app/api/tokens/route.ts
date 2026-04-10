import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { launchStore } from '@/lib/store';

// List all tokens launched on SovereignLaunch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Get launches from our store
    const launches = launchStore.getAll()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);

    // Fetch additional details from BAGS API for each token
    const tokensWithDetails = await Promise.all(
      launches.map(async (launch) => {
        const bagsData = await bagsApi.getToken(launch.tokenAddress);
        return {
          ...launch,
          bagsData: bagsData.success ? bagsData.data : null
        };
      })
    );

    return NextResponse.json({
      tokens: tokensWithDetails,
      total: launchStore.getAll().length,
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
