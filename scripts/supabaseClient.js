const SUPABASE_URL = 'https://tsvfopwndnpnpapnlwxg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzdmZvcHduZG5wbnBhcG5sd3hnIiwi\
cm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzYwMjIsImV4cCI6MjA3NjI1MjAyMn0.YtVMHTFzJAXX_1-sltWQa_7YOWa_YdNqnAj2cXv7F88';

function ensureSupabaseClient() {
  if (typeof window === 'undefined') {
    return null;
  }

  const supabaseLib = window.supabase ?? globalThis.supabase;

  if (!supabaseLib || typeof supabaseLib.createClient !== 'function') {
    return null;
  }

  if (!window.supabaseClient) {
    window.supabaseClient = supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return window.supabaseClient;
}

function waitForSupabaseClient() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('[Supabase] 브라우저 환경에서만 사용할 수 있습니다.'));
  }

  if (window.supabaseClientReady && typeof window.supabaseClientReady.then === 'function') {
    return window.supabaseClientReady;
  }

  window.supabaseClientReady = new Promise((resolve, reject) => {
    try {
      const client = ensureSupabaseClient();
      if (client) {
        resolve(client);
        return;
      }
    } catch (error) {
      console.error('[Supabase] 초기화 오류:', error);
      reject(error);
      return;
    }

    const start = Date.now();
    const timeoutMs = 5000;
    const poll = setInterval(() => {
      try {
        const client = ensureSupabaseClient();
        if (client) {
          clearInterval(poll);
          resolve(client);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(poll);
          const error = new Error('[Supabase] supabase-js 라이브러리를 찾을 수 없습니다.');
          console.error(error.message);
          reject(error);
        }
      } catch (error) {
        clearInterval(poll);
        console.error('[Supabase] 초기화 오류:', error);
        reject(error);
      }
    }, 50);
  });

  return window.supabaseClientReady;
}

if (typeof window !== 'undefined') {
  waitForSupabaseClient();

  if (typeof window.getSupabaseClient !== 'function') {
    window.getSupabaseClient = async () => {
      try {
        return await window.supabaseClientReady;
      } catch (error) {
        return null;
      }
    };
  }
}

