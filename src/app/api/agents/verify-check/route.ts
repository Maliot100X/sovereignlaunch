import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verificationStore, verifyApiKey } from '@/lib/store';

// POST: Check if code was tweeted and verify
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    const auth = verifyApiKey(apiKey || '');

    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
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

    // Find the verification
    const verification = verificationStore.getByCode(verificationCode);

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 404 }
      );
    }

    // Verify this code belongs to this agent
    if (verification.agentId !== agent.id) {
      return NextResponse.json(
        { error: 'Verification code does not match this agent' },
        { status: 403 }
      );
    }

    // If tweet URL provided, validate it
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
      verificationStore.markVerified(verificationCode);

      // Update agent
      (agent as any).twitterVerified = true;
      (agent as any).twitterVerifiedAt = new Date().toISOString();
      (agent as any).twitterUrl = tweetUrl;
      agentStore.set(agent.id, agent);

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
    return NextResponse.json({
      success: true,
      verified: false,
      verificationCode,
      twitterHandle: verification.twitterHandle,
      status: 'pending',
      instructions: {
        tweet: `I just registered my agent on @SovereignLaunch! 🚀 https://sovereignlaunch.vercel.app/agents/${agent.id} #${verificationCode}`,
        submitEndpoint: '/api/agents/verify-check',
        method: 'POST with tweetUrl'
      }
    });

  } catch (error) {
    console.error('[Verify-Check] Error:', error);
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
    const auth = verifyApiKey(apiKey || '');

    if (!auth.valid || !auth.agent) {
      return NextResponse.json(
        { error: auth.error || 'Invalid API key' },
        { status: 401 }
      );
    }

    const agent = auth.agent;
    const pending = verificationStore.getByAgentId(agent.id);

    return NextResponse.json({
      success: true,
      verified: agent.twitterVerified || false,
      twitterHandle: agent.twitterHandle || null,
      twitterVerifiedAt: (agent as any).twitterVerifiedAt || null,
      badge: agent.twitterVerified ? '✓ Twitter Verified' : null,
      pendingVerification: pending && pending.status === 'pending' ? {
        code: pending.code,
        createdAt: pending.createdAt
      } : null
    });

  } catch (error) {
    console.error('[Verify-Check GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
