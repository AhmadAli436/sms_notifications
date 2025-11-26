import mongoose from 'mongoose';

const phonePushMappingSchema = new mongoose.Schema({
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    index: true,
  },
  push_token: {
    type: String,
    required: [true, 'Push token is required'],
    trim: true,
  },
  deviceType: {
    type: String,
    enum: ['android', 'ios', 'web'],
    default: 'web',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
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
phonePushMappingSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for faster lookups
phonePushMappingSchema.index({ phone_number: 1, isActive: 1 });

const PhonePushMapping = mongoose.models.PhonePushMapping || mongoose.model('PhonePushMapping', phonePushMappingSchema);

export default PhonePushMapping;

