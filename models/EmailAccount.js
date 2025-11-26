import mongoose from 'mongoose';

const emailAccountSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    trim: true,
  },
  friendlyName: {
    type: String,
    required: [true, 'Friendly name is required'],
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
emailAccountSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const EmailAccount = mongoose.models.EmailAccount || mongoose.model('EmailAccount', emailAccountSchema);

export default EmailAccount;

