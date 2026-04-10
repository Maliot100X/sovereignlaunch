import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { launchStore, agentStore } from '@/lib/store';

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { address } = params;

    // Fetch token details from BAGS API
    const tokenResult = await bagsApi.getToken(address);
    if (!tokenResult.success) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    // Fetch metrics
    const metricsResult = await bagsApi.getTokenMetrics(address);

    // Fetch holders
    const holdersResult = await bagsApi.getTokenHolders(address);

    // Find launch details from our store
    const launch = launchStore.getByTokenAddress(address);
    let agent = null;
    if (launch) {
      agent = agentStore.getById(launch.agentId);
    }

    return NextResponse.json({
      token: tokenResult.data,
      metrics: metricsResult.success ? metricsResult.data : null,
      holders: holdersResult.success ? holdersResult.data : [],
      launch: launch || null,
      agent: agent ? {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet
      } : null
    });

  } catch (error) {
    console.error('Error fetching token details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
