import { NextRequest, NextResponse } from 'next/server';
import { agentStore, verificationStore, verifyApiKey } from '@/lib/store';

// POST: Submit tweet URL for manual verification
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

    if (!verificationCode || !tweetUrl) {
      return NextResponse.json(
        { error: 'verificationCode and tweetUrl required' },
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

    // Validate URL format (supports twitter.com and x.com)
    const isValidTweetUrl = /(?:twitter|x)\.com\/\w+\/status\/\d+/.test(tweetUrl);
    if (!isValidTweetUrl) {
      return NextResponse.json(
        { error: 'Invalid tweet URL. Format: https://twitter.com/username/status/1234567890' },
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
        message: `Agent *${agent.name}* verified via manual submit!\n\nHandle: @${verification.twitterHandle}`,
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('[Verify-Submit] Telegram notification failed:', e);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      verificationCode,
      twitterHandle: verification.twitterHandle,
      tweetUrl,
      badge: '✓ Twitter Verified',
      message: 'Twitter verification successful! Badge added to profile.',
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Verify-Submit] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
