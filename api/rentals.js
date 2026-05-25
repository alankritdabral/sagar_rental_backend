import connectDB, { verifyAuth } from './_utils.js';
import User from './models/User.js';
import Rental from './models/Rental.js';

export default async function handler(req, res) {
  await connectDB();

  try {
    const decodedToken = await verifyAuth(req);
    const uid = decodedToken.uid;

    if (req.method === 'GET') {
      if (decodedToken.role === 'admin' && req.query.all) {
        const rentals = await Rental.find({}).sort({ createdAt: -1 });
        return res.status(200).json(rentals);
      }
      const rental = await Rental.findOne({ userId: req.query.userId || uid });
      return res.status(200).json(rental);
    }

    if (req.method === 'POST') {
      // Admin creating rental
      if (decodedToken.role !== 'admin') return res.status(403).send('Forbidden');

      const {
        userId,
        vehicleNo,
        vehicleModel,
        meterReading,
        rentDate,
        returnDate,
        rent,
        security,
        totalAmount
      } = req.body;

      if (!userId || !vehicleNo || !vehicleModel || !rentDate || !returnDate || rent === undefined || security === undefined) {
        return res.status(400).json({ error: 'Missing required rental details' });
      }

      const rental = await Rental.findOneAndUpdate(
        { userId },
        { 
          userId,
          vehicleNo,
          vehicleModel,
          meterReading,
          helmetNo: req.body.helmetNo,
          rentDate,
          returnDate,
          rent,
          security,
          totalAmount,
          paymentStatus: req.body.paymentStatus || 'unpaid'
        },
        { upsert: true, new: true }
      );
      
      console.log(`🚗 Rental created/updated for user: ${userId}`);
      return res.status(200).json(rental);
    }

    if (req.method === 'PATCH') {
      // User updating payment status OR Admin verifying payment
      const { transactionId, paymentStatus, userId } = req.body;
      
      if (!paymentStatus) return res.status(400).json({ error: 'Payment status is required' });

      // Security Check: Only admin can set 'paid' or 'unpaid'
      if (decodedToken.role !== 'admin') {
        if (paymentStatus === 'paid') return res.status(403).json({ error: 'Only administrators can confirm payments' });
        if (paymentStatus !== 'pending_verification') return res.status(400).json({ error: 'Invalid status update for user' });
        if (!transactionId || transactionId.trim().length < 8) return res.status(400).json({ error: 'Valid Transaction ID / UTR is required' });
      }

      const targetId = (decodedToken.role === 'admin' && userId) ? userId : uid;

      const rental = await Rental.findOneAndUpdate(
        { userId: targetId },
        { 
          ...(transactionId && { transactionId }), 
          paymentStatus 
        },
        { new: true }
      );

      if (!rental) return res.status(404).json({ error: 'Rental record not found' });

      console.log(`💰 Payment update: ${targetId} -> ${paymentStatus}`);
      return res.status(200).json(rental);
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
