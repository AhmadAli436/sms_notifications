import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PushToken from '@/models/PushToken';

export async function GET() {
  try {
    await connectDB();

    const tokens = await PushToken.find({ isActive: true })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const formattedTokens = tokens.map(token => ({
      id: token._id.toString(),
      token: token.token.substring(0, 50) + '...', // Show partial token for security
      deviceType: token.deviceType,
      deviceInfo: token.deviceInfo,
      userId: token.userId ? {
        id: token.userId._id?.toString(),
        name: token.userId.name,
        email: token.userId.email,
      } : null,
      createdAt: token.createdAt,
    }));

    return NextResponse.json({
      tokens: formattedTokens,
      total: formattedTokens.length,
    });
  } catch (error) {
    console.error('Error fetching push tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch push tokens', tokens: [] },
      { status: 500 }
    );
  }
}

