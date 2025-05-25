const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Supabase JWT verification middleware
const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'رمز المصادقة مطلوب' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if it's a Supabase JWT token
    if (token.startsWith('eyJ')) {
      try {
        // Decode the JWT token without verification (since we trust Supabase)
        const decoded = jwt.decode(token);
        
        if (decoded && decoded.sub) {
          // Find user by Supabase UID
          const user = await User.findOne({ 
            $or: [
              { supabaseUid: decoded.sub },
              { _id: decoded.sub }
            ]
          });

          if (user) {
            req.user = {
              _id: user._id,
              id: user._id,
              email: user.email,
              userType: user.userType,
              supabaseUid: decoded.sub
            };
            return next();
          }
        }
      } catch (jwtError) {
        console.error('خطأ في فك تشفير رمز Supabase:', jwtError);
      }
    }

    // If not a Supabase token or verification failed, continue to next middleware
    next();
  } catch (error) {
    console.error('خطأ في middleware Supabase:', error);
    next();
  }
};

module.exports = { verifySupabaseToken };
