import mongoose from 'mongoose';

const twilioAccountSchema = new mongoose.Schema({
  account_sid: {
    type: String,
    required: [true, 'Account SID is required'],
    trim: true,
  },
  auth_token: {
    type: String,
    required: [true, 'Auth Token is required'],
    trim: true,
  },
  twilio_number: {
    type: String,
    required: [true, 'Twilio number is required'],
    trim: true,
  },
  sender_name: {
    type: String,
    required: [true, 'Sender name is required'],
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

// Update the updatedAt field before saving
twilioAccountSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const TwilioAccount = mongoose.models.TwilioAccount || mongoose.model('TwilioAccount', twilioAccountSchema);

export default TwilioAccount;

