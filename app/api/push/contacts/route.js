import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Contact from '@/models/Contact';

// Helper function to normalize phone number
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

// Helper function to normalize gateway
function normalizeGateway(gw) {
  return gw.toLowerCase().trim().replace(/^@/, '');
}

// Helper function to clean text
function cleanText(text) {
  if (!text || text === 'NaN') return '';
  return String(text).replace(/\xa0/g, ' ').trim().replace(/[^\x20-\x7E]+/g, '');
}

export async function GET() {
  try {
    await connectDB();

    // Fetch all active contacts from database
    const contacts = await Contact.find({ isActive: true }).lean();

    // Format contacts for frontend (matching Flask approach)
    const formattedContacts = contacts.map(contact => {
      const phone = cleanText(normalizePhone(contact.phone_number));
      const gateway = cleanText(normalizeGateway(contact.carrier_gateway));
      
      // Build gateway email exactly like Flask: phone@gateway or phone+gateway
      let gatewayEmail;
      if (gateway.includes('@')) {
        gatewayEmail = `${phone}${gateway}`;
      } else {
        gatewayEmail = `${phone}@${gateway}`;
      }

      // Format phone for display (remove leading + if present, add spaces)
      let displayPhone = phone.replace(/^\+/, ''); // Remove + if present
      // Add spaces for readability (format: XX XXX XXXX XXXX or similar)
      if (displayPhone.length >= 10) {
        displayPhone = displayPhone.replace(/(\d{2})(\d{3})(\d{4})(\d{0,4})/, (match, p1, p2, p3, p4) => {
          if (p4) return `${p1} ${p2} ${p3} ${p4}`;
          return `${p1} ${p2} ${p3}`;
        }).trim();
      }

      return {
        id: contact._id.toString(),
        phone_number: phone,
        display_phone: displayPhone || phone,
        carrier_gateway: gateway,
        gateway_email: gatewayEmail,
        displayName: contact.displayName || displayPhone || phone,
      };
    });

    return NextResponse.json({ contacts: formattedContacts });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contacts', contacts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { phone_number, carrier_gateway, displayName } = body;

    // Validation
    if (!phone_number || !carrier_gateway) {
      return NextResponse.json(
        { error: 'Phone number and carrier gateway are required' },
        { status: 400 }
      );
    }

    // Create new contact
    const newContact = await Contact.create({
      phone_number: cleanText(normalizePhone(phone_number)),
      carrier_gateway: cleanText(normalizeGateway(carrier_gateway)),
      displayName: displayName || cleanText(normalizePhone(phone_number)),
    });

    return NextResponse.json({
      success: true,
      message: 'Contact added successfully',
      contact: {
        id: newContact._id,
        phone_number: newContact.phone_number,
        carrier_gateway: newContact.carrier_gateway,
      },
    });
  } catch (error) {
    console.error('Error adding contact:', error);
    return NextResponse.json(
      { error: 'Failed to add contact', details: error.message },
      { status: 500 }
    );
  }
}

