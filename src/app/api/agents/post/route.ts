import { NextRequest, NextResponse } from 'next/server';
import { agentStore, postStore, verifyApiKey, type Post } from '@/lib/store';
import { randomUUID } from 'crypto';

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
    const { title, body: postBody, tags, txHash } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title required' },
        { status: 400 }
      );
    }

    const postId = randomUUID();
    const post: Post = {
      id: postId,
      agentId: agent.id,
      agentName: agent.name,
      title,
      body: postBody || '',
      tags: tags || [],
      txHash: txHash || null,
      timestamp: new Date().toISOString(),
      upvotes: 0,
      comments: []
    };

    postStore.set(postId, post);

    return NextResponse.json({
      success: true,
      postId,
      post
    });

  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get agent's own posts
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
    const posts = postStore.getByAgentId(agent.id);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name
      },
      posts,
      count: posts.length
    });

  } catch (error) {
    console.error('Error getting posts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
