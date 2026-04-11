import { NextResponse } from 'next/server';
import { agentStore, verificationStore } from '@/lib/store';

// Twitter API Bearer Token (should be in env)
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// This route is called by Vercel Cron every 1 minute
// export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check if Twitter API is configured
    if (!TWITTER_BEARER_TOKEN) {
      console.log('[Twitter Cron] TWITTER_BEARER_TOKEN not set, skipping auto-verification');
      return NextResponse.json({
        success: true,
        message: 'Twitter API not configured - manual verification only',
        verified: 0,
        pending: verificationStore.getAllPending().length
      });
    }

    const pendingVerifications = verificationStore.getAllPending();

    if (pendingVerifications.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending verifications',
        verified: 0,
        pending: 0
      });
    }

    let verifiedCount = 0;

    for (const verification of pendingVerifications) {
      try {
        // Search for tweets with the verification hashtag
        const searchQuery = `#${verification.code} @SovereignLaunch`;

        const twitterResponse = await fetch(
          `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&max_results=10`,
          {
            headers: {
              'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!twitterResponse.ok) {
          console.error(`[Twitter Cron] API error for ${verification.code}:`, await twitterResponse.text());
          continue;
        }

        const twitterData = await twitterResponse.json();
        const tweets = twitterData.data || [];

        for (const tweet of tweets) {
          // Check if tweet contains agent profile link
          const agent = agentStore.getById(verification.agentId);
          if (!agent) continue;

          const profileUrl = `sovereignlaunch.vercel.app/agents/${verification.agentId}`;

          if (tweet.text.includes(profileUrl) || tweet.text.includes(verification.code)) {
            // Mark as verified
            verificationStore.markVerified(verification.code);

            // Update agent
            (agent as any).twitterVerified = true;
            (agent as any).twitterVerifiedAt = new Date().toISOString();
            (agent as any).twitterUrl = `https://twitter.com/i/web/status/${tweet.id}`;
            agentStore.set(agent.id, agent);

            verifiedCount++;

            // Send Telegram notification
            try {
              const { telegramBot } = await import('@/lib/telegram-server');
              await telegramBot.sendNotification({
                type: 'system',
                title: '✓ Twitter Auto-Verified',
                message: `Agent *${agent.name}* auto-verified via Twitter!\n\nHandle: @${verification.twitterHandle}`,
                timestamp: new Date().toISOString()
              });
            } catch (e) {
              console.error('[Twitter Cron] Telegram notification failed:', e);
            }

            console.log(`[Twitter Cron] Auto-verified agent ${agent.name} with code ${verification.code}`);
            break;
          }
        }
      } catch (error) {
        console.error(`[Twitter Cron] Error processing ${verification.code}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${pendingVerifications.length} pending verifications`,
      verified: verifiedCount,
      pending: verificationStore.getAllPending().length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Twitter Cron] Fatal error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    );
  }
}
