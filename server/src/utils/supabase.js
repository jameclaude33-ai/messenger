const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rtwbihaputyimjxrdlxi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ0d2JpaGFwdXR5aW1qeHJkbHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2OTAyNzcsImV4cCI6MjA5ODI2NjI3N30.L9hD151jnwnnxyLtZkK9j2ybTg1vcDyHSAQkwHlAk7g';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase };
