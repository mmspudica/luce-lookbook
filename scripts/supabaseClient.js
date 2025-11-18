const SUPABASE_URL = 'https://tsvfopwndnpnpapnlwxg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZvcHduZG5wbnBhcG5sd3hnIiwiY3JvbGUiOiJhbm9uIiwiaWF0IjoxNzYwNjc2MDIyLCJleHAiOjIwNzYyNTIwMjJ9.YtVMHTFzJAXX_1-sltWQa_7YOWa_YdNqnAj2cXv7F88';

const PROFILE_TABLE_CANDIDATES = ['profile', 'profiles'];
let profileTableNamePromise = null;

function isMissingTableError(error) {
  if (!error) return false;
  const message = String(error.message || '').toLowerCase();
  return message.includes('schema cache') || message.includes('does not exist');
}

function resolveProfileTableName() {
  if (typeof window === 'undefined') {
    return Promise.resolve('profile');
  }

  if (!window.supabaseClient) {
    return Promise.resolve('profile');
  }

  if (!profileTableNamePromise) {
    profileTableNamePromise = (async () => {
      for (const tableName of PROFILE_TABLE_CANDIDATES) {
        try {
          const { error } = await window.supabaseClient
            .from(tableName)
            .select('id', { head: true, count: 'exact' });

          if (!error) {
            return tableName;
          }

          if (!isMissingTableError(error)) {
            throw error;
          }
        } catch (error) {
          if (!isMissingTableError(error)) {
            console.error('Supabase table probe failed', error);
            throw error;
          }
        }
      }

      return PROFILE_TABLE_CANDIDATES[0];
    })().catch(error => {
      profileTableNamePromise = null;
      throw error;
    });
  }

  return profileTableNamePromise;
}

if (typeof window !== 'undefined' && !window.supabaseClient) {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

if (typeof window !== 'undefined') {
  window.resolveSupabaseProfileTable = resolveProfileTableName;
}
