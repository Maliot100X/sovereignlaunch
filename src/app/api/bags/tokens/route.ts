import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'createdAt';

    const response = await bagsApi.getTokens({ limit, offset, sortBy });

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokens: response.data });
  } catch (error) {
    console.error('Error in /api/bags/tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await bagsApi.launchToken(body);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to launch token' },
        { status: 400 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in /api/bags/tokens:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
