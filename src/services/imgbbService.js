const axios = require('axios');

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;

async function uploadToImgbb(base64Image) {
  if (!IMGBB_API_KEY) {
    throw new Error('IMGBB_API_KEY is not set in environment variables.');
  }
  const url = 'https://api.imgbb.com/1/upload';
  const params = new URLSearchParams();
  params.append('key', IMGBB_API_KEY);
  params.append('image', base64Image);

  const response = await axios.post(url, params);
  if (!response.data || !response.data.data || !response.data.data.url) {
    throw new Error('Failed to upload image to imgbb.');
  }
  // Return imgbb image object
  return response.data.data;
}

module.exports = { uploadToImgbb };
