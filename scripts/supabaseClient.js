const SUPABASE_URL = 'https://tsvfopwndnpnpapnlwxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZvcHduZG5wbnBhcG5sd3hnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzYwMjIsImV4cCI6MjA3NjI1MjAyMn0.YtVMHTFzJAXX_1-sltWQa_7YOWa_YdNqnAj2cXv7F88';

if (typeof window !== 'undefined' && !window.supabaseClient) {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
