import { createClient } from '@supabase/supabase-js';

// Usamos las credenciales de tu archivo .env del backend
const supabaseUrl = 'https://lqbitbyemwxqcjgmjayg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxYml0YnllbXd4cWNqZ21qYXlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzgzNDUsImV4cCI6MjA5MzE1NDM0NX0.ebb5ckLetwsqVTYntGXdyBJA98fvykOi1mRQzfN-sT8';

export const supabase = createClient(supabaseUrl, supabaseKey);