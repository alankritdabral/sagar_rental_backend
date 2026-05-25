import connectDB, { verifyAuth } from './_utils.js';
import User from './models/User.js';

export default async function handler(req, res) {
  await connectDB();

  try {
    const decodedToken = await verifyAuth(req);
    const uid = decodedToken.uid;

    if (req.method === 'GET') {
      // 1. If admin requests all users, return array
      if (decodedToken.role === 'admin' && req.query.all) {
        const users = await User.find({}).sort({ createdAt: -1 });
        return res.status(200).json(users);
      }

      // 2. Handle virtual admin user info request
      if (uid === 'admin_root') {
        return res.status(200).json({ uid: 'admin_root', role: 'admin', fullName: 'System Administrator' });
      }

      // 3. Regular user info request
      return res.status(200).json(await User.findOne({ uid }));
    }

    if (req.method === 'POST') {
      // Create or Update user data
      const {
        fullName,
        email,
        phone,
        address,
        dlNumber,
        aadhaarNumber,
        documents,
        declarationAccepted
      } = req.body;

      // Basic Validation
      if (!fullName || fullName.trim().length < 3) return res.status(400).json({ error: 'Full name is required (min 3 chars)' });
      if (!phone || phone.length < 10) return res.status(400).json({ error: 'Valid phone number is required' });
      if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email is required' });
      if (!address || address.length < 10) return res.status(400).json({ error: 'Full address is required' });
      if (!dlNumber) return res.status(400).json({ error: 'Driving License number is required' });
      if (!aadhaarNumber || aadhaarNumber.length < 12) return res.status(400).json({ error: 'Valid Aadhaar number is required' });
      if (!declarationAccepted) return res.status(400).json({ error: 'Declaration must be accepted' });

      // Document Validation
      const requiredDocs = ['userPhoto', 'dlFront', 'dlBack', 'aadhaar', 'selfie'];
      if (!documents) return res.status(400).json({ error: 'Documents are required' });
      for (const doc of requiredDocs) {
        if (!documents[doc]) return res.status(400).json({ error: `Missing document: ${doc}` });
      }

      // Securely construct update object (prevent user from setting role/status)
      const updateData = {
        fullName,
        email,
        phone,
        address,
        dlNumber,
        aadhaarNumber,
        documents,
        declarationAccepted,
        status: 'pending' // Always reset to pending on update/create
      };

      const user = await User.findOneAndUpdate(
        { uid },
        { ...updateData, uid },
        { upsert: true, new: true }
      );
      
      console.log(`👤 User profile submitted for review: ${user.fullName} (${user.phone})`);
      return res.status(200).json(user);
    }

    if (req.method === 'PATCH') {
      // Admin updating user status
      if (decodedToken.role !== 'admin') return res.status(403).send('Forbidden');
      
      const { targetUid, updates } = req.body;
      if (!targetUid || !updates) return res.status(400).json({ error: 'Target UID and updates are required' });

      // Allowed updates: status, role
      const allowedUpdates = ['status', 'role'];
      const filteredUpdates = {};
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) filteredUpdates[key] = updates[key];
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid update fields provided' });
      }

      const updatedUser = await User.findOneAndUpdate(
        { uid: targetUid }, 
        filteredUpdates, 
        { new: true }
      );

      if (!updatedUser) return res.status(404).json({ error: 'User not found' });

      console.log(`🛠️ User ${targetUid} updated by admin: ${JSON.stringify(filteredUpdates)}`);
      return res.status(200).json(updatedUser);
    }

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
}
