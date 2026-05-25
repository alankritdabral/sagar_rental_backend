import mongoose from 'mongoose';

const RentalSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  vehicleNo: String,
  vehicleModel: String,
  meterReading: Number,
  helmetNo: String,
  rentDate: String,
  returnDate: String,
  rent: Number,
  security: Number,
  totalAmount: Number,
  paymentStatus: { type: String, enum: ['unpaid', 'pending_verification', 'paid'], default: 'unpaid' },
  transactionId: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.RentalTransaction || mongoose.model('RentalTransaction', RentalSchema);
