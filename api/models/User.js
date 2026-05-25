import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  fullName: String,
  phone: String,
  email: String,
  address: String,
  dlNumber: String,
  aadhaarNumber: String,
  documents: {
    userPhoto: String,
    dlFront: String,
    dlBack: String,
    aadhaar: String,
    selfie: String
  },
  signatureUrl: String,
  declarationAccepted: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.RentalUser || mongoose.model('RentalUser', UserSchema);
