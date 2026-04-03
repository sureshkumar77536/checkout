// Supabase Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Database Schema Helpers
export const db = {
    // Tokens
    tokens: () => supabase.from('tokens'),
    
    // Cards
    cards: () => supabase.from('cards'),
    
    // Admin Users
    admins: () => supabase.from('admins'),
    
    // Checkout Logs
    logs: () => supabase.from('checkout_logs'),
    
    // Token Usage
    usage: () => supabase.from('token_usage')
};

// Real-time subscriptions
export const subscribeToToken = (tokenId, callback) => {
    return supabase
        .channel(`token-${tokenId}`)
        .on('postgres_changes', 
            { event: 'UPDATE', schema: 'public', table: 'tokens', filter: `id=eq.${tokenId}` },
            callback
        )
        .subscribe();
};
