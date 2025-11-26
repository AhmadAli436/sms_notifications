import mongoose from 'mongoose';

const pushTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: [true, 'Push token is required'],
    unique: true,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  deviceType: {
    type: String,
    enum: ['android', 'ios', 'web'],
    default: 'web',
  },
  deviceInfo: {
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

// Update the updatedAt field before saving
pushTokenSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const PushToken = mongoose.models.PushToken || mongoose.model('PushToken', pushTokenSchema);

export default PushToken;

