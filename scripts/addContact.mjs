import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const rootDir = join(__dirname, '..');
const envFiles = ['.env.local', '.env'];

let envLoaded = false;
for (const envFile of envFiles) {
  const envPath = join(rootDir, envFile);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`📄 Loaded environment from: ${envFile}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  dotenv.config();
}

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: DB_URL or MONGODB_URI environment variable is not set');
  process.exit(1);
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  return digits;
}

function normalizeGateway(gw) {
  return gw.toLowerCase().trim().replace(/^@/, '');
}

function cleanText(text) {
  if (!text || text === 'NaN') return '';
  return String(text).replace(/\xa0/g, ' ').trim().replace(/[^\x20-\x7E]+/g, '');
}

const contactSchema = new mongoose.Schema({
  phone_number: {
    type: String,
    required: true,
    trim: true,
  },
  carrier_gateway: {
    type: String,
    required: true,
    trim: true,
  },
  displayName: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Contact = mongoose.models?.Contact || mongoose.model('Contact', contactSchema);

async function addContact() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('📝 Usage: node scripts/addContact.mjs <phone_number> <carrier_gateway> [display_name]');
      console.log('   Example: node scripts/addContact.mjs 923370612601 vtext.com "John Doe"');
      console.log('   Example: node scripts/addContact.mjs 919821989278 @vtext.com');
      process.exit(1);
    }

    const phone_number = args[0];
    const carrier_gateway = args[1];
    const displayName = args[2] || '';

    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connected successfully!');

    // Normalize and clean
    const normalizedPhone = cleanText(normalizePhone(phone_number));
    const normalizedGateway = cleanText(normalizeGateway(carrier_gateway));

    // Build gateway email
    const gatewayEmail = normalizedGateway.includes('@') 
      ? `${normalizedPhone}${normalizedGateway}` 
      : `${normalizedPhone}@${normalizedGateway}`;

    // Create contact
    console.log('📱 Creating contact...');
    const contact = await Contact.create({
      phone_number: normalizedPhone,
      carrier_gateway: normalizedGateway,
      displayName: displayName || normalizedPhone,
    });

    console.log('✅ Contact created successfully!');
    console.log('📋 Contact Details:');
    console.log(`   Phone: ${contact.phone_number}`);
    console.log(`   Gateway: ${contact.carrier_gateway}`);
    console.log(`   Gateway Email: ${gatewayEmail}`);
    console.log(`   Display Name: ${contact.displayName}`);
    console.log(`   ID: ${contact._id}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addContact();

