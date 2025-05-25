const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://geqnmbnhyzzhqcouldfz.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlcW5tYm5oeXp6aHFjb3VsZGZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTI3NTMsImV4cCI6MjA2Mzc2ODc1M30.TV92S0BtPGtihgoKjcsW2svZl74_EdcrtJ60AUnIaHw';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // We don't need session persistence on the server
    detectSessionInUrl: false
  }
});

// Test Supabase connection
const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('test').select('*').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist, which is fine
      console.error('❌ Supabase connection test failed:', error);
      return false;
    }
    console.log('✅ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
    return false;
  }
};

// Verify JWT token from Supabase
const verifySupabaseToken = async (token) => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      console.error('Supabase token verification failed:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    return null;
  }
};

// Get user by Supabase UID
const getSupabaseUser = async (uid) => {
  try {
    const { data: { user }, error } = await supabase.auth.admin.getUserById(uid);
    
    if (error) {
      console.error('Error getting Supabase user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Error getting Supabase user:', error);
    return null;
  }
};

module.exports = {
  supabase,
  testSupabaseConnection,
  verifySupabaseToken,
  getSupabaseUser
};
