import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { bagsApi } from '@/lib/bags-api';

// GET: Get claimable fees for agent
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required in x-api-key header' },
        { status: 401 }
      );
    }

    // Find agent by API key
    const agentId = await redis.get(`agent:apikey:${apiKey}`);
    if (!agentId) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get agent data
    const agentData = await redis.get(`agent:${agentId}`);
    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = JSON.parse(agentData);
    const agentWallet = agent.wallet;

    if (!agentWallet) {
      return NextResponse.json(
        { error: 'Agent has no wallet configured' },
        { status: 400 }
      );
    }

    // Fetch claimable fees from BAGS API
    const feesResult = await bagsApi.getFeesForClaim(agentWallet);

    if (!feesResult.success || !feesResult.data) {
      return NextResponse.json({
        success: true,
        claimableFees: [],
        totalUsd: 0,
        agentWallet,
        message: 'No claimable fees at this time'
      });
    }

    // Get agent's launched tokens for context
    const tokenIds = await redis.smembers(`agent:tokens:${agentId}`);
    const launches = await Promise.all(
      tokenIds.map(async (id) => {
        const data = await redis.get(`token:${id}`);
        return data ? JSON.parse(data) : null;
      })
    );

    // Enrich fee data with token info
    const claimableFees = (feesResult.data || []).map((fee: any) => {
      const tokenLaunch = launches.find((l: any) =>
        l?.tokenAddress === fee.tokenAddress || l?.tokenMint === fee.tokenAddress
      );

      return {
        token: fee.tokenAddress,
        tokenMint: fee.tokenAddress,
        tokenSymbol: fee.tokenSymbol || tokenLaunch?.symbol || '???',
        tokenName: fee.tokenName || tokenLaunch?.name || 'Unknown Token',
        amount: fee.amount || fee.claimableAmount || 0,
        amountUsd: fee.amountUsd || fee.usdValue || 0,
        totalEarned: fee.totalEarned || fee.lifetimeEarnings || 0,
        lastClaimed: fee.lastClaimed || null,
        canClaim: (fee.amount || 0) > 0
      };
    });

    // Calculate totals
    const totalUsd = claimableFees.reduce((sum: number, fee: any) => sum + (fee.amountUsd || 0), 0);
    const totalAmount = claimableFees.reduce((sum: number, fee: any) => sum + (fee.amount || 0), 0);

    return NextResponse.json({
      success: true,
      claimableFees,
      totalUsd,
      totalAmount,
      agentWallet,
      feeSplit: {
        agent: '65%',
        platform: '35%'
      },
      platformWallet: 'Dgk9bcm6H6LVaamyXQWeNCXh2HuTFoE4E7Hu7Pw1aiPx',
      message: claimableFees.length > 0
        ? `${claimableFees.length} tokens have claimable fees`
        : 'No fees to claim at this time'
    });

  } catch (error) {
    console.error('[Fees GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Claim fees for a token
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required in x-api-key header' },
        { status: 401 }
      );
    }

    // Find agent by API key
    const agentId = await redis.get(`agent:apikey:${apiKey}`);
    if (!agentId) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Get agent data
    const agentData = await redis.get(`agent:${agentId}`);
    if (!agentData) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    const agent = JSON.parse(agentData);
    const agentWallet = agent.wallet;

    if (!agentWallet) {
      return NextResponse.json(
        { error: 'Agent has no wallet configured' },
        { status: 400 }
      );
    }

    // Get token to claim from request body
    const body = await request.json();
    const { tokenMint, tokenAddress } = body;

    const targetToken = tokenMint || tokenAddress;

    if (!targetToken) {
      return NextResponse.json(
        { error: 'tokenMint or tokenAddress required' },
        { status: 400 }
      );
    }

    // Claim fees via BAGS API
    const claimResult = await bagsApi.claimFees(targetToken, agentWallet);

    if (!claimResult.success) {
      return NextResponse.json({
        success: false,
        error: claimResult.error || 'Failed to claim fees',
        token: targetToken
      }, { status: 400 });
    }

    // Update agent stats
    const claimedAmount = claimResult.data?.amount || 0;
    agent.stats = agent.stats || {};
    agent.stats.totalFees = (agent.stats.totalFees || 0) + Number(claimedAmount);
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    // Send Telegram notification
    try {
      const { telegramBot } = await import('@/lib/telegram-server');
      await telegramBot.notifyFeeClaim(
        targetToken.slice(0, 6) + '...',
        claimedAmount.toString(),
        agentWallet
      );
    } catch (e) {
      console.error('[Fees Claim] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Fees claimed successfully!',
      claim: {
        token: targetToken,
        amount: claimedAmount,
        transactionSignature: claimResult.data?.signature || null,
        claimedAt: new Date().toISOString()
      },
      agentWallet,
      note: '65% of fees go to your wallet, 35% to platform'
    });

  } catch (error) {
    console.error('[Fees POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
