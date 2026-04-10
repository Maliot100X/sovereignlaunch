import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';
import { agentStore, verifyApiKey } from '@/lib/store';

// Get claimable fees for the authenticated agent
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;

    // Fetch claimable fees from BAGS API
    const result = await bagsApi.getFeesForClaim(agent.wallet);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to fetch fees' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      fees: result.data || [],
      agent: {
        id: agent.id,
        name: agent.name,
        wallet: agent.wallet
      }
    });

  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Claim fees for a specific token
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');
    if (!auth.valid) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      );
    }

    if (!auth.agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const body = await request.json();
    const { tokenAddress } = body;

    if (!tokenAddress) {
      return NextResponse.json(
        { error: 'tokenAddress required' },
        { status: 400 }
      );
    }

    // Execute fee claim via BAGS API
    const result = await bagsApi.claimFees(tokenAddress, agent.wallet);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to claim fees' },
        { status: 400 }
      );
    }

    // Update agent stats
    agent.stats.totalFees += parseFloat(result.data?.amount || '0');

    return NextResponse.json({
      success: true,
      claim: result.data,
      message: 'Fees claimed successfully'
    });

  } catch (error) {
    console.error('Error claiming fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
