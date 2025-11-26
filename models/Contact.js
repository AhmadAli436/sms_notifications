import mongoose from 'mongoose';

const contactSchema = new mongoose.Schema({
  phone_number: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
  },
  carrier_gateway: {
    type: String,
    required: [true, 'Carrier gateway is required'],
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

// Update the updatedAt field before saving
contactSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const Contact = mongoose.models.Contact || mongoose.model('Contact', contactSchema);

export default Contact;

