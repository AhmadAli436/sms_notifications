import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import EmailAccount from '@/models/EmailAccount';

export async function GET() {
  try {
    await connectDB();

    // Fetch all active email accounts from database
    const accounts = await EmailAccount.find({ isActive: true }).lean();

    if (accounts.length === 0) {
      return NextResponse.json({
        accounts: [],
        message: 'No email accounts found. Please add accounts to the database.',
      });
    }

    // Format accounts for frontend
    const formattedAccounts = accounts.map(account => ({
      id: account._id.toString(),
      email: account.email,
      password: account.password,
      friendlyName: account.friendlyName,
    }));

    return NextResponse.json({ accounts: formattedAccounts });
  } catch (error) {
    console.error('Error fetching email accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email accounts', accounts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { email, password, friendlyName } = body;

    // Validation
    if (!email || !password || !friendlyName) {
      return NextResponse.json(
        { error: 'All fields are required: email, password, friendlyName' },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if account with same email already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account with this email already exists' },
        { status: 400 }
      );
    }

    // Create new email account
    const newAccount = await EmailAccount.create({
      email: email.toLowerCase(),
      password,
      friendlyName,
    });

    return NextResponse.json({
      success: true,
      message: 'Email account added successfully',
      account: {
        id: newAccount._id,
        email: newAccount.email,
        friendlyName: newAccount.friendlyName,
      },
    });
  } catch (error) {
    console.error('Error adding email account:', error);
    return NextResponse.json(
      { error: 'Failed to add email account', details: error.message },
      { status: 500 }
    );
  }
}

