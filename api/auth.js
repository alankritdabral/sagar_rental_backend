import jwt from 'jsonwebtoken';
import connectDB from './_utils.js';
import User from './models/User.js';

export default async function handler(req, res) {
  console.log(`Auth Handler: Method=${req.method}, Action=${req.query.action}`);
  await connectDB();

  const { action } = req.query;

  if (req.method === 'POST') {
    if (action === 'admin-login') {
      const { username, password } = req.body;
      console.log(`Admin Login Attempt: user=${username}`);
      
      const adminUser = process.env.ADMIN_USERNAME;
      const adminPass = process.env.ADMIN_PASSWORD;
      const jwtSecret = process.env.JWT_SECRET;

      if (!adminUser || !adminPass || !jwtSecret) {
        return res.status(500).json({ error: 'Server security configuration missing' });
      }

      if (username === adminUser && password === adminPass) {
        const uid = 'admin_root';
        const role = 'admin';
        
        const token = jwt.sign(
          { uid, phone: 'admin', role },
          jwtSecret,
          { expiresIn: '7d' }
        );

        return res.status(200).json({ 
          token, 
          user: { uid, phone: 'admin', role, fullName: 'System Administrator' } 
        });
      } else {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }
    }

    if (action === 'login') {
      const { phone } = req.body;
      if (!phone || phone.length < 10) return res.status(400).json({ error: 'Valid phone number is required' });

      // Find or create user to get UID
      let user = await User.findOne({ phone });
      
      // Get admin phone from env
      const adminPhone = process.env.ADMIN_PHONE;
      const expectedRole = (adminPhone && phone === adminPhone) ? 'admin' : 'user';

      if (!user) {
        const uid = `user_${Date.now()}`;
        user = await User.create({ uid, phone, role: expectedRole, status: 'pending' });
      } else if (user.role !== expectedRole) {
        user.role = expectedRole;
        await user.save();
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) return res.status(500).json({ error: 'JWT_SECRET missing' });

      // Generate JWT with role
      const token = jwt.sign(
        { uid: user.uid, phone: user.phone, role: user.role },
        jwtSecret,
        { expiresIn: '7d' }
      );

      return res.status(200).json({ token, user });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
