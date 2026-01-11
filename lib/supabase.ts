
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// If credentials are missing, we export a mock-ish client that handles errors gracefully
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Logs a transcription/translation pair to Supabase.
 * Table expected: 'translations' 
 * Columns: session_id (uuid), user_text (text), agent_text (text), language (text)
 */
export async function logToSupabase(data: {
  session_id: string;
  user_text: string;
  agent_text: string;
  language: string;
}) {
  if (!supabase) {
    console.debug('Supabase client not initialized (check environment variables).');
    return;
  }

  const { error } = await supabase
    .from('translations')
    .insert([data]);

  if (error) {
    console.error('Supabase Sync Error:', error.message);
  } else {
    console.debug('Supabase Sync Successful');
  }
}
