import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// Initialize MongoDB
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected Successfully');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
};

// Auth Middleware Helper
export const verifyAuth = async (req) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) throw new Error('Unauthorized');
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('❌ JWT_SECRET is not defined in environment variables');
    throw new Error('Internal Server Error: Security configuration missing');
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (err) {
    console.error('❌ Auth Failed:', err.message);
    throw new Error(`Invalid or expired token: ${err.message}`);
  }
};

export default connectDB;
