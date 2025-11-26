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

const emailAccountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
  },
  friendlyName: {
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

const EmailAccount = mongoose.models?.EmailAccount || mongoose.model('EmailAccount', emailAccountSchema);

async function addEmailAccount() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.log('📝 Usage: node scripts/addEmailAccount.mjs <email> <password> <friendly_name>');
      console.log('   Example: node scripts/addEmailAccount.mjs user@gmail.com password123 "My Gmail Account"');
      process.exit(1);
    }

    const email = args[0];
    const password = args[1];
    const friendlyName = args[2];

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Database connected successfully!');

    // Check if account already exists
    const existingAccount = await EmailAccount.findOne({ email: email.toLowerCase() });
    if (existingAccount) {
      console.error(`❌ Error: Account with email ${email} already exists`);
      await mongoose.disconnect();
      process.exit(1);
    }

    // Create account
    console.log('📧 Creating email account...');
    const account = await EmailAccount.create({
      email: email.toLowerCase(),
      password,
      friendlyName,
    });

    console.log('✅ Email account created successfully!');
    console.log('📋 Account Details:');
    console.log(`   Email: ${account.email}`);
    console.log(`   Friendly Name: ${account.friendlyName}`);
    console.log(`   ID: ${account._id}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

addEmailAccount();

