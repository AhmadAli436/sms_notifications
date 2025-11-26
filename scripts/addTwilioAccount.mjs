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

const twilioAccountSchema = new mongoose.Schema({
  account_sid: {
    type: String,
    required: true,
    trim: true,
  },
  auth_token: {
    type: String,
    required: true,
    trim: true,
  },
  twilio_number: {
    type: String,
    required: true,
    trim: true,
  },
  sender_name: {
    type: String,
    required: true,
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

const TwilioAccount = mongoose.models?.TwilioAccount || mongoose.model('TwilioAccount', twilioAccountSchema);

async function addTwilioAccount() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 4) {
      console.log('📝 Usage: node scripts/addTwilioAccount.mjs <account_sid> <auth_token> <twilio_number> <sender_name>');
      console.log('   Example: node scripts/addTwilioAccount.mjs AC123... abc123... +1234567890 "My Account"');
      process.exit(1);
    }

    const account_sid = args[0];
    const auth_token = args[1];
    const twilio_number = args[2];
    const sender_name = args[3];

    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connected successfully!');

    // Check if account already exists
    const existingAccount = await TwilioAccount.findOne({ account_sid });
    if (existingAccount) {
      console.error(`❌ Error: Account with SID ${account_sid} already exists`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Create account
    console.log('📱 Creating Twilio account...');
    const account = await TwilioAccount.create({
      account_sid,
      auth_token,
      twilio_number,
      sender_name,
    });

    console.log('✅ Twilio account created successfully!');
    console.log('📋 Account Details:');
    console.log(`   Account SID: ${account.account_sid}`);
    console.log(`   Twilio Number: ${account.twilio_number}`);
    console.log(`   Sender Name: ${account.sender_name}`);
    console.log(`   ID: ${account._id}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addTwilioAccount();

