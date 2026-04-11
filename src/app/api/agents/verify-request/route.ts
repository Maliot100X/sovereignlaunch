import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import redis from '@/lib/redis';

// Generate verification code: VERIFY-XXXXXNN
function generateCode(): string {
  const letters = randomBytes(3).toString('base64url').toUpperCase().slice(0, 5);
  const numbers = Math.floor(10 + Math.random() * 90);
  return `VERIFY-${letters}${numbers}`;
}

// POST: Request Twitter verification code
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
    const body = await request.json();
    const { twitterHandle } = body;

    if (!twitterHandle) {
      return NextResponse.json(
        { error: 'twitterHandle required' },
        { status: 400 }
      );
    }

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

    // Check for existing pending verification
    const existingKeys = await redis.keys(`verify:${agentId}:*`);
    if (existingKeys.length > 0) {
      const existingData = await redis.get(existingKeys[0]);
      if (existingData) {
        const existing = JSON.parse(existingData);
        const ttl = await redis.ttl(existingKeys[0]);
        return NextResponse.json({
          success: true,
          verificationCode: existing.code,
          twitterHandle: existing.twitterHandle,
          message: 'Existing verification code found',
          expiresInSeconds: ttl,
          instructions: {
            tweet: `I just registered my agent on @SovereignLaunch! 🚀\n\nhttps://sovereignlaunch.vercel.app/agents/${agentId}\n#${existing.code}`,
            mustInclude: ['@SovereignLaunch', existing.code, 'sovereignlaunch.vercel.app'],
            autoDetect: true,
            manualSubmit: '/api/agents/verify-submit'
          }
        });
      }
    }

    // Generate new code
    const code = generateCode();
    const cleanHandle = twitterHandle.replace('@', '').trim();

    // Store verification code with 24h expiry
    const verifyData = {
      agentId,
      code,
      twitterHandle: cleanHandle,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Store with 24 hour expiry (86400 seconds)
    await redis.setex(`verify:${agentId}:${code}`, 86400, JSON.stringify(verifyData));

    // Update agent with twitter handle
    agent.twitterHandle = cleanHandle;
    await redis.set(`agent:${agentId}`, JSON.stringify(agent));

    return NextResponse.json({
      success: true,
      verificationCode: code,
      twitterHandle: cleanHandle,
      agentId,
      profileUrl: `https://sovereignlaunch.vercel.app/agents/${agentId}`,
      expiresIn: '24 hours',
      instructions: {
        tweet: `I just registered my agent on @SovereignLaunch! 🚀\n\nhttps://sovereignlaunch.vercel.app/agents/${agentId}\n#${code}`,
        mustInclude: ['@SovereignLaunch', code, 'sovereignlaunch.vercel.app'],
        autoDetect: true,
        manualSubmit: '/api/agents/verify-submit'
      }
    });

  } catch (error) {
    console.error('[Verify-Request] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
