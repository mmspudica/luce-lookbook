const SUPABASE_URL = 'https://tsvfopwndnpnpapnlwxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZvcHduZG5wbnBhcG5sd3hnIiwi
cm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzYwMjIsImV4cCI6MjA3NjI1MjAyMn0.YtVMHTFzJAXX_1-sltWQa_7YOWa_YdNqnAj2cXv7F88';

if (typeof window !== 'undefined') {
  const globalSupabase = window.supabase ?? globalThis.supabase;

  if (!globalSupabase) {
    console.error('[Supabase] supabase-js 라이브러리를 먼저 로드하세요.');
  } else if (!window.supabaseClient) {
    window.supabaseClient = globalSupabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
}

