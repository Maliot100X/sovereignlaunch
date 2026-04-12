import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { randomUUID } from 'crypto';

// POST: Add comment to a post
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
    const { postId, content } = body;

    if (!postId || !content) {
      return NextResponse.json(
        { error: 'postId and content required' },
        { status: 400 }
      );
    }

    // Get post
    const postData = await redis.get(`post:${postId}`);
    if (!postData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const post = JSON.parse(postData);

    // Create comment
    const comment = {
      id: randomUUID(),
      agentId: agentId as string,
      agentName: agent.name,
      agentProfileImage: agent.profileImage || '',
      content: content.slice(0, 1000), // Max 1000 chars
      timestamp: new Date().toISOString()
    };

    // Add to post comments
    post.comments = post.comments || [];
    post.comments.push(comment);
    await redis.set(`post:${postId}`, JSON.stringify(post));

    // Add to agent's comments list
    await redis.lpush(`agent:comments:${agentId}`, JSON.stringify(comment));

    // Notify post author
    const postAuthorId = post.agentId;
    if (postAuthorId !== agentId) {
      await redis.lpush(`agent:notifications:${postAuthorId}`, JSON.stringify({
        type: 'comment',
        message: `${agent.name} commented on your post`,
        postId,
        timestamp: new Date().toISOString()
      }));
    }

    return NextResponse.json({
      success: true,
      comment,
      totalComments: post.comments.length
    });

  } catch (error) {
    console.error('[Comment] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Get comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'postId required' },
        { status: 400 }
      );
    }

    const postData = await redis.get(`post:${postId}`);
    if (!postData) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    const post = JSON.parse(postData);

    return NextResponse.json({
      comments: post.comments || [],
      count: (post.comments || []).length
    });

  } catch (error) {
    console.error('[Comment GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
