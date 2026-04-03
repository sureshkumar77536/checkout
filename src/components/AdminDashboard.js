import { supabase, db } from '../supabase.js';
import App from '../main.js';

export class AdminDashboard {
    constructor(user) {
        this.user = user;
        this.tokens = [];
        this.cards = [];
        this.stats = {
            totalTokens: 0,
            activeTokens: 0,
            totalCheckouts: 0,
            creditsUsed: 0
        };
    }

    async render() {
        const container = document.createElement('div');
        container.className = 'min-h-screen p-4 md:p-8 fade-in';
        
        await this.loadData();
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto">
                <!-- Header -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 class="text-4xl font-bold mb-2">Admin Dashboard</h1>
                        <p class="text-gray-400">Manage tokens, cards, and monitor usage</p>
                    </div>
                    <button id="logoutBtn" class="btn-god btn-secondary">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </button>
                </div>

                <!-- Stats -->
                <div class="stats-grid mb-8">
                    <div class="stat-card">
                        <div class="stat-value">${this.stats.totalTokens}</div>
                        <div class="stat-label">Total Tokens</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); -webkit-background-clip: text;">${this.stats.activeTokens}</div>
                        <div class="stat-label">Active Tokens</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); -webkit-background-clip: text;">${this.stats.totalCheckouts}</div>
                        <div class="stat-label">Total Checkouts</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); -webkit-background-clip: text;">${this.stats.creditsUsed}</div>
                        <div class="stat-label">Credits Used</div>
                    </div>
                </div>

                <!-- Main Grid -->
                <div class="grid lg:grid-cols-2 gap-8">
                    <!-- Token Management -->
                    <div class="glass-card p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold"><i class="fas fa-key mr-2 text-indigo-500"></i>Token Management</h2>
                            <button id="generateTokenBtn" class="btn-god text-sm py-2 px-4">
                                <i class="fas fa-plus mr-2"></i>Generate Token
                            </button>
                        </div>

                        <div id="tokenList" class="space-y-4 max-h-96 overflow-y-auto">
                            ${this.renderTokenList()}
                        </div>
                    </div>

                    <!-- Card Management -->
                    <div class="glass-card p-6">
                        <div class="flex justify-between items-center mb-6">
                            <h2 class="text-2xl font-bold"><i class="fas fa-credit-card mr-2 text-pink-500"></i>Card Vault</h2>
                            <button id="addCardBtn" class="btn-god text-sm py-2 px-4">
                                <i class="fas fa-plus mr-2"></i>Add Card
                            </button>
                        </div>

                        <div id="cardList" class="space-y-4 max-h-96 overflow-y-auto">
                            ${this.renderCardList()}
                        </div>
                    </div>
                </div>

                <!-- Token Generator Modal -->
                <div id="tokenModal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div class="glass-card p-8 w-full max-w-md m-4">
                        <h3 class="text-2xl font-bold mb-6">Generate New Token</h3>
                        <form id="tokenForm" class="space-y-4">
                            <div>
                                <label class="block text-sm mb-2">Credits (Requests)</label>
                                <input type="number" id="tokenCredits" class="input-god" min="1" value="10" required>
                            </div>
                            <div>
                                <label class="block text-sm mb-2">Expiry Date (Optional)</label>
                                <input type="datetime-local" id="tokenExpiry" class="input-god">
                            </div>
                            <div class="flex gap-4 mt-6">
                                <button type="button" id="cancelToken" class="btn-god btn-secondary flex-1">Cancel</button>
                                <button type="submit" class="btn-god flex-1">Generate</button>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Add Card Modal -->
                <div id="cardModal" class="hidden fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div class="glass-card p-8 w-full max-w-md m-4">
                        <h3 class="text-2xl font-bold mb-6">Add Virtual Card</h3>
                        <form id="cardForm" class="space-y-4">
                            <div>
                                <label class="block text-sm mb-2">Card Nickname</label>
                                <input type="text" id="cardName" class="input-god" placeholder="e.g., Card 1" required>
                            </div>
                            <div>
                                <label class="block text-sm mb-2">Card Number</label>
                                <input type="text" id="cardNumber" class="input-god" placeholder="4242 4242 4242 4242" maxlength="19" required>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-sm mb-2">Expiry (MM/YY)</label>
                                    <input type="text" id="cardExpiry" class="input-god" placeholder="12/25" maxlength="5" required>
                                </div>
                                <div>
                                    <label class="block text-sm mb-2">CVC</label>
                                    <input type="text" id="cardCvc" class="input-god" placeholder="123" maxlength="4" required>
                                </div>
                            </div>
                            <div class="flex gap-4 mt-6">
                                <button type="button" id="cancelCard" class="btn-god btn-secondary flex-1">Cancel</button>
                                <button type="submit" class="btn-god flex-1">Add Card</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        this.attachEvents(container);
        return container;
    }

    async loadData() {
        // Load tokens
        const { data: tokens } = await db.tokens().select('*').order('created_at', { ascending: false });
        this.tokens = tokens || [];
        
        // Load cards
        const { data: cards } = await db.cards().select('*').order('created_at', { ascending: false });
        this.cards = cards || [];
        
        // Calculate stats
        this.stats.totalTokens = this.tokens.length;
        this.stats.activeTokens = this.tokens.filter(t => t.is_active && !t.is_revoked).length;
        this.stats.totalCheckouts = this.tokens.reduce((acc, t) => acc + (t.usage_count || 0), 0);
        this.stats.creditsUsed = this.tokens.reduce((acc, t) => acc + (t.credits_used || 0), 0);
    }

    renderTokenList() {
        if (this.tokens.length === 0) {
            return `<div class="text-center py-8 text-gray-500">No tokens generated yet</div>`;
        }

        return this.tokens.map(token => `
            <div class="p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-indigo-500 transition-all">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="token-display mb-2">${token.token_value}</div>
                        <div class="flex items-center gap-2">
                            <span class="credit-badge">
                                <i class="fas fa-coins"></i>
                                ${token.credits_remaining} / ${token.total_credits} credits
                            </span>
                            ${token.is_revoked ? '<span class="px-2 py-1 bg-red-500 bg-opacity-20 text-red-500 rounded text-xs">REVOKED</span>' : ''}
                            ${!token.is_active ? '<span class="px-2 py-1 bg-yellow-500 bg-opacity-20 text-yellow-500 rounded text-xs">INACTIVE</span>' : ''}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        ${!token.is_revoked ? `
                            <button onclick="this.dispatchEvent(new CustomEvent('revokeToken', {detail: '${token.id}', bubbles: true}))" 
                                class="p-2 text-red-400 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition-all" title="Revoke Token">
                                <i class="fas fa-ban"></i>
                            </button>
                        ` : ''}
                        <button onclick="this.dispatchEvent(new CustomEvent('deleteToken', {detail: '${token.id}', bubbles: true}))" 
                            class="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-all" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="text-xs text-gray-500 mt-2">
                    Created: ${new Date(token.created_at).toLocaleDateString()} | 
                    Uses: ${token.usage_count || 0} | 
                    ${token.expires_at ? 'Expires: ' + new Date(token.expires_at).toLocaleDateString() : 'No Expiry'}
                </div>
            </div>
        `).join('');
    }

    renderCardList() {
        if (this.cards.length === 0) {
            return `<div class="text-center py-8 text-gray-500">No cards added yet</div>`;
        }

        return this.cards.map(card => `
            <div class="p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-pink-500 transition-all relative overflow-hidden">
                <div class="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-500 opacity-10 rounded-bl-full"></div>
                <div class="flex justify-between items-start relative z-10">
                    <div>
                        <h4 class="font-semibold text-lg mb-1">${card.card_name}</h4>
                        <div class="font-mono text-gray-400 text-sm tracking-wider">
                            **** **** **** ${card.last_four}
                        </div>
                        <div class="text-xs text-gray-500 mt-2">
                            Expires: ${card.expiry_month}/${card.expiry_year}
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="this.dispatchEvent(new CustomEvent('deleteCard', {detail: '${card.id}', bubbles: true}))" 
                            class="p-2 text-gray-400 hover:bg-red-500 hover:bg-opacity-20 hover:text-red-500 rounded-lg transition-all">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    attachEvents(container) {
        // Logout
        container.querySelector('#logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
        });

        // Token Modal
        const tokenModal = container.querySelector('#tokenModal');
        container.querySelector('#generateTokenBtn').addEventListener('click', () => {
            tokenModal.classList.remove('hidden');
        });
        container.querySelector('#cancelToken').addEventListener('click', () => {
            tokenModal.classList.add('hidden');
        });

        // Card Modal
        const cardModal = container.querySelector('#cardModal');
        container.querySelector('#addCardBtn').addEventListener('click', () => {
            cardModal.classList.remove('hidden');
        });
        container.querySelector('#cancelCard').addEventListener('click', () => {
            cardModal.classList.add('hidden');
        });

        // Generate Token
        container.querySelector('#tokenForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const credits = parseInt(container.querySelector('#tokenCredits').value);
            const expiry = container.querySelector('#tokenExpiry').value;
            
            const tokenValue = this.generateTokenString();
            
            const { error } = await db.tokens().insert({
                token_value: tokenValue,
                total_credits: credits,
                credits_remaining: credits,
                created_by: this.user.id,
                expires_at: expiry || null,
                is_active: true,
                is_revoked: false,
                usage_count: 0,
                credits_used: 0
            });

            if (error) {
                App.showToast('Failed to generate token', 'error');
            } else {
                App.showToast('Token generated successfully!', 'success');
                tokenModal.classList.add('hidden');
                // Refresh
                const dashboard = new AdminDashboard(this.user);
                document.getElementById('app').innerHTML = '';
                document.getElementById('app').appendChild(await dashboard.render());
            }
        });

        // Add Card
        container.querySelector('#cardForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = container.querySelector('#cardName').value;
            const number = container.querySelector('#cardNumber').value.replace(/\s/g, '');
            const expiry = container.querySelector('#cardExpiry').value;
            const cvc = container.querySelector('#cardCvc').value;
            
            const [month, year] = expiry.split('/');
            
            const { error } = await db.cards().insert({
                card_name: name,
                card_number: number, // In production, encrypt this!
                last_four: number.slice(-4),
                expiry_month: month,
                expiry_year: '20' + year,
                cvc: cvc, // In production, encrypt this!
                created_by: this.user.id,
                is_active: true
            });

            if (error) {
                App.showToast('Failed to add card', 'error');
            } else {
                App.showToast('Card added successfully!', 'success');
                cardModal.classList.add('hidden');
                // Refresh
                const dashboard = new AdminDashboard(this.user);
                document.getElementById('app').innerHTML = '';
                document.getElementById('app').appendChild(await dashboard.render());
            }
        });

        // Revoke Token
        container.addEventListener('revokeToken', async (e) => {
            const { error } = await db.tokens()
                .update({ is_revoked: true, revoked_at: new Date().toISOString() })
                .eq('id', e.detail);
            
            if (!error) {
                App.showToast('Token revoked successfully', 'success');
                const dashboard = new AdminDashboard(this.user);
                document.getElementById('app').innerHTML = '';
                document.getElementById('app').appendChild(await dashboard.render());
            }
        });

        // Delete Token
        container.addEventListener('deleteToken', async (e) => {
            if (!confirm('Are you sure?')) return;
            await db.tokens().delete().eq('id', e.detail);
            App.showToast('Token deleted', 'success');
            const dashboard = new AdminDashboard(this.user);
            document.getElementById('app').innerHTML = '';
            document.getElementById('app').appendChild(await dashboard.render());
        });

        // Delete Card
        container.addEventListener('deleteCard', async (e) => {
            if (!confirm('Are you sure?')) return;
            await db.cards().delete().eq('id', e.detail);
            App.showToast('Card deleted', 'success');
            const dashboard = new AdminDashboard(this.user);
            document.getElementById('app').innerHTML = '';
            document.getElementById('app').appendChild(await dashboard.render());
        });

        // Format card number input
        const cardInput = container.querySelector('#cardNumber');
        if (cardInput) {
            cardInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '');
                value = value.match(/.{1,4}/g)?.join(' ') || value;
                e.target.value = value;
            });
        }
    }

    generateTokenString() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 32; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return 'stk_' + token;
    }
              }
