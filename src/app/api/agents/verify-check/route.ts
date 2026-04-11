import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

// POST: Check if code was tweeted and verify
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
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
    const body = await request.json();
    const { verificationCode, tweetUrl } = body;

    // Check if already verified
    if (agent.twitterVerified) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: 'Agent already verified',
        twitterHandle: agent.twitterHandle,
        badge: '✓ Twitter Verified'
      });
    }

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'verificationCode required' },
        { status: 400 }
      );
    }

    // Find the verification code
    const verifyKey = `verify:${agentId}:${verificationCode}`;
    const verifyData = await redis.get(verifyKey);

    if (!verifyData) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 404 }
      );
    }

    const verification = JSON.parse(verifyData);

    // Verify this code belongs to this agent
    if (verification.agentId !== agentId) {
      return NextResponse.json(
        { error: 'Verification code does not match this agent' },
        { status: 403 }
      );
    }

    // If tweet URL provided, validate and verify
    if (tweetUrl) {
      // Validate URL format
      const isValidTweetUrl = /(?:twitter|x)\.com\/\w+\/status\/\d+/.test(tweetUrl);
      if (!isValidTweetUrl) {
        return NextResponse.json(
          { error: 'Invalid tweet URL format' },
          { status: 400 }
        );
      }

      // Mark as verified
      agent.twitterVerified = true;
      agent.verifiedAt = new Date().toISOString();
      agent.tweetUrl = tweetUrl;
      await redis.set(`agent:${agentId}`, JSON.stringify(agent));

      // Delete verification code
      await redis.del(verifyKey);

      // Send Telegram notification
      try {
        const { telegramBot } = await import('@/lib/telegram-server');
        await telegramBot.sendNotification({
          type: 'system',
          title: '✓ Twitter Verified',
          message: `Agent *${agent.name}* is now verified!\n\nHandle: @${verification.twitterHandle}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.error('[Verify-Check] Telegram notification failed:', e);
      }

      return NextResponse.json({
        success: true,
        verified: true,
        verificationCode,
        twitterHandle: verification.twitterHandle,
        tweetUrl,
        badge: '✓ Twitter Verified',
        message: 'Twitter verification successful!'
      });
    }

    // Return current status
    const ttl = await redis.ttl(verifyKey);
    return NextResponse.json({
      success: true,
      verified: false,
      verificationCode,
      twitterHandle: verification.twitterHandle,
      status: 'pending',
      expiresInSeconds: ttl,
      instructions: {
        tweet: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agentId} #${verificationCode}`,
        submitEndpoint: '/api/agents/verify-check',
        method: 'POST with tweetUrl'
      }
    });

  } catch (error) {
    console.error('[Verify-Check POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Check verification status
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
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

    // Check for pending verifications
    const pendingKeys = await redis.keys(`verify:${agentId}:*`);
    let pendingVerification = null;
    if (pendingKeys.length > 0) {
      const pendingData = await redis.get(pendingKeys[0]);
      if (pendingData) {
        const pending = JSON.parse(pendingData);
        const ttl = await redis.ttl(pendingKeys[0]);
        pendingVerification = {
          code: pending.code,
          createdAt: pending.createdAt,
          expiresInSeconds: ttl
        };
      }
    }

    return NextResponse.json({
      success: true,
      verified: agent.twitterVerified || false,
      twitterHandle: agent.twitterHandle || null,
      twitterVerifiedAt: agent.verifiedAt || null,
      badge: agent.twitterVerified ? '✓ Twitter Verified' : null,
      pendingVerification
    });

  } catch (error) {
    console.error('[Verify-Check GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
