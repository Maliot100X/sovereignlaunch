import { NextRequest, NextResponse } from 'next/server';
import { bagsApi } from '@/lib/bags-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameter: wallet' },
        { status: 400 }
      );
    }

    const response = await bagsApi.getFeesForClaim(walletAddress);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to fetch fees' },
        { status: 500 }
      );
    }

    return NextResponse.json({ fees: response.data });
  } catch (error) {
    console.error('Error in /api/bags/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenAddress, walletAddress } = body;

    if (!tokenAddress || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenAddress, walletAddress' },
        { status: 400 }
      );
    }

    const response = await bagsApi.claimFees(tokenAddress, walletAddress);

    if (!response.success) {
      return NextResponse.json(
        { error: response.error || 'Failed to claim fees' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      signature: response.data?.signature,
      amount: response.data?.amount,
      message: 'Fees claimed successfully'
    });
  } catch (error) {
    console.error('Error in /api/bags/fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
