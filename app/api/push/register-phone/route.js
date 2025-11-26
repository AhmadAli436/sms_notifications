import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import PhonePushMapping from '@/models/PhonePushMapping';

// Helper function to normalize phone number
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { phone_number, push_token, deviceType, userId } = body;

    // Validation
    if (!phone_number || !push_token) {
      return NextResponse.json(
        { error: 'Phone number and push token are required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Normalize phone number
    const normalizedPhone = normalizePhone(phone_number);

    // Check if mapping already exists
    let mapping = await PhonePushMapping.findOne({ phone_number: normalizedPhone });

    if (mapping) {
      // Update existing mapping
      mapping.push_token = push_token;
      mapping.deviceType = deviceType || mapping.deviceType;
      mapping.userId = userId || mapping.userId;
      mapping.isActive = true;
      await mapping.save();
    } else {
      // Create new mapping
      mapping = await PhonePushMapping.create({
        phone_number: normalizedPhone,
        push_token,
        deviceType: deviceType || 'web',
        userId: userId || null,
        isActive: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Phone number mapped to push token successfully',
      mappingId: mapping._id,
    });
  } catch (error) {
    console.error('Error registering phone push mapping:', error);
    return NextResponse.json(
      { error: 'Failed to register phone push mapping', details: error.message },
      { status: 500 }
    );
  }
}

