import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from multiple possible locations
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

// Also try loading from default .env location
if (!envLoaded) {
  dotenv.config();
}

const MONGODB_URI = process.env.DB_URL || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: DB_URL or MONGODB_URI environment variable is not set');
  console.error('');
  console.error('Please create a .env.local or .env file in the root directory with:');
  console.error('   DB_URL=your_mongodb_connection_string');
  console.error('');
  console.error('Example:');
  console.error('   DB_URL=mongodb://localhost:27017/sms_notifications');
  console.error('   or');
  console.error('   DB_URL=mongodb+srv://username:password@cluster.mongodb.net/database');
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.models?.User || mongoose.model('User', userSchema);

async function addUser() {
  try {
    // Get user data from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('📝 Usage: npm run add-user <email> <password> [name] [role]');
      console.log('   Example: npm run add-user admin@example.com password123 "Admin User" admin');
      process.exit(1);
    }

    const email = args[0];
    const password = args[1];
    const name = args[2] || email.split('@')[0];
    const role = args[3] || 'user';

    // Validate email
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      console.error('❌ Error: Invalid email format');
      process.exit(1);
    }

    // Validate password
    if (password.length < 6) {
      console.error('❌ Error: Password must be at least 6 characters');
      process.exit(1);
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    const maskedUrl = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`📍 Database URL: ${maskedUrl}`);
    
    await mongoose.connect(MONGODB_URI);
    
    console.log('✅ Database connected successfully!');
    console.log(`📊 Database Name: ${mongoose.connection.db.databaseName}`);
    console.log(`🔗 Connection State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error(`❌ Error: User with email ${email} already exists`);
      await mongoose.disconnect();
      console.log('🔌 Disconnected from database');
      process.exit(1);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    console.log('👤 Creating user...');
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
    });

    console.log('✅ User created successfully!');
    console.log('📋 User Details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID: ${user._id}`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from database');
    }
    process.exit(1);
  }
}

addUser();

