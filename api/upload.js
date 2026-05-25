import axios from 'axios';
import FormData from 'form-data';
import crypto from 'crypto';
import connectDB, { verifyAuth } from './_utils.js';

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

const signCloudinaryParams = (params, apiSecret) => {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(sorted + apiSecret).digest("hex");
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  await connectDB();

  try {
    const decodedToken = await verifyAuth(req);
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const timestamp = Math.floor(Date.now() / 1000);
    const folderPath = `renting_business/${decodedToken.uid}/${folder || 'misc'}`;

    const paramsToSign = {
      folder: folderPath,
      timestamp: timestamp,
    };

    const signature = signCloudinaryParams(paramsToSign, API_SECRET);

    const form = new FormData();
    form.append("file", image); 
    form.append("api_key", API_KEY);
    form.append("timestamp", timestamp.toString());
    form.append("signature", signature);
    form.append("folder", folderPath);

    const response = await axios.post(url, form, {
      headers: { ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000, 
    });

    console.log('✅ Cloudinary Upload Successful:', response.data.secure_url);
    return res.status(200).json({ url: response.data.secure_url });

  } catch (error) {
    const errData = error.response?.data || error.message || error;
    console.error('❌ Cloudinary Upload Error Details:', JSON.stringify(errData, null, 2));
    const errorMsg = (typeof errData === 'object') ? (errData.error?.message || JSON.stringify(errData)) : errData;
    return res.status(500).json({ error: errorMsg });
  }
}
