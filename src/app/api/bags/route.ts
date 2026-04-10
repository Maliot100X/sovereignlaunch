import { NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';

export async function GET() {
  try {
    const response = await bagsApi.getLaunchpadStats();

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch BAGS API stats' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'connected',
      stats: response.data,
      apiUrl: process.env.BAGS_API_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in /api/bags:', error);
    return NextResponse.json(
      { error: 'Failed to connect to BAGS API' },
      { status: 500 }
    );
  }
}
