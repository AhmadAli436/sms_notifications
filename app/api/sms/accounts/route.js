import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import TwilioAccount from '@/models/TwilioAccount';

export async function GET() {
  try {
    await connectDB();

    // Fetch all active Twilio accounts from database
    const accounts = await TwilioAccount.find({ isActive: true }).lean();

    if (accounts.length === 0) {
      // Fallback to environment variables if no accounts in database
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      const friendlyName = process.env.TWILIO_FRIENDLY_NAME || 'Main Account';

      if (accountSid && authToken && phoneNumber) {
        return NextResponse.json({
          accounts: [
            {
              accountSid: accountSid,
              authToken: authToken,
              phoneNumber: phoneNumber,
              friendlyName: friendlyName,
            },
          ],
        });
      }

      return NextResponse.json({
        accounts: [],
        message: 'No Twilio accounts found. Please add accounts to the database or configure environment variables.',
      });
    }

    // Format accounts for frontend (include auth_token for sending)
    const formattedAccounts = accounts.map(account => ({
      accountSid: account.account_sid,
      authToken: account.auth_token,
      phoneNumber: account.twilio_number,
      friendlyName: account.sender_name,
    }));

    return NextResponse.json({ accounts: formattedAccounts });
  } catch (error) {
    console.error('Error fetching Twilio accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Twilio accounts', accounts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { account_sid, auth_token, twilio_number, sender_name } = body;

    // Validation
    if (!account_sid || !auth_token || !twilio_number || !sender_name) {
      return NextResponse.json(
        { error: 'All fields are required: account_sid, auth_token, twilio_number, sender_name' },
        { status: 400 }
      );
    }

    // Check if account with same SID already exists
    const existingAccount = await TwilioAccount.findOne({ account_sid });
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account with this SID already exists' },
        { status: 400 }
      );
    }

    // Create new Twilio account
    const newAccount = await TwilioAccount.create({
      account_sid,
      auth_token,
      twilio_number,
      sender_name,
    });

    return NextResponse.json({
      success: true,
      message: 'Twilio account added successfully',
      account: {
        id: newAccount._id,
        account_sid: newAccount.account_sid,
        twilio_number: newAccount.twilio_number,
        sender_name: newAccount.sender_name,
      },
    });
  } catch (error) {
    console.error('Error adding Twilio account:', error);
    return NextResponse.json(
      { error: 'Failed to add Twilio account', details: error.message },
      { status: 500 }
    );
  }
}
