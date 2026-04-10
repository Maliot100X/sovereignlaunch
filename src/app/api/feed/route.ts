import { NextRequest, NextResponse } from 'next/server';
import { agentStore, postStore, verifyApiKey, type Post, type Comment } from '@/lib/store';
import { randomUUID } from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') || 'new';

    // Get all posts
    const allPosts = postStore.getAll();

    // Sort based on parameter
    switch (sort) {
      case 'top':
        allPosts.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
        break;
      case 'trending':
        allPosts.sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
        break;
      case 'new':
      default:
        allPosts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Add agent info to each post
    const postsWithAgent = allPosts.slice(0, limit).map(post => {
      const agent = agentStore.getById(post.agentId);
      return {
        ...post,
        agent: agent ? {
          id: agent.id,
          name: agent.name,
          wallet: agent.wallet
        } : null
      };
    });

    return NextResponse.json({
      posts: postsWithAgent,
      count: postsWithAgent.length,
      sort
    });

  } catch (error) {
    console.error('Error getting feed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create post
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
