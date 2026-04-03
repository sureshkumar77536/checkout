import { supabase } from '../supabase.js';
import App from '../main.js';

export class Auth {
    constructor() {
        this.isLogin = true;
    }

    render() {
        const container = document.createElement('div');
        container.className = 'min-h-screen flex items-center justify-center p-4 fade-in';
        
        container.innerHTML = `
            <div class="glass-card w-full max-w-md p-8 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                
                <div class="text-center mb-8">
                    <div class="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-3xl">
                        <i class="fas fa-bolt text-white"></i>
                    </div>
                    <h1 class="text-3xl font-bold mb-2">Stripe Auto Checkout</h1>
                    <p class="text-gray-400">Admin Access Only</p>
                </div>

                <form id="authForm" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium mb-2 text-gray-300">Email Address</label>
                        <input type="email" id="email" class="input-god" placeholder="admin@example.com" required>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium mb-2 text-gray-300">Password</label>
                        <input type="password" id="password" class="input-god" placeholder="••••••••" required>
                    </div>

                    <button type="submit" class="btn-god w-full">
                        <i class="fas fa-sign-in-alt mr-2"></i>
                        <span id="btnText">Sign In</span>
                    </button>
                </form>

                <div class="mt-6 text-center text-sm text-gray-500">
                    <p>Only authorized admins can access this panel</p>
                </div>
            </div>
        `;

        this.attachEvents(container);
        return container;
    }

    attachEvents(container) {
        const form = container.querySelector('#authForm');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = container.querySelector('#email').value;
            const password = container.querySelector('#password').value;
            const btnText = container.querySelector('#btnText');
            
            btnText.textContent = 'Authenticating...';
            
            try {
                // Check if email is in allowed admins list
                const { data: allowedAdmin } = await supabase
                    .from('allowed_emails')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (!allowedAdmin) {
                    throw new Error('Unauthorized email address');
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Check if admin exists in admins table
                const { data: admin } = await supabase
                    .from('admins')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                if (!admin) {
                    // Create admin entry if first time
                    await supabase.from('admins').insert({
                        id: data.user.id,
                        email: email,
                        created_at: new Date().toISOString()
                    });
                }

                App.showToast('Welcome back, Admin!', 'success');
                
            } catch (err) {
                App.showToast(err.message, 'error');
                btnText.textContent = 'Sign In';
            }
        });
    }
}
