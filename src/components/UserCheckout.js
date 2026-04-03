import { supabase, db } from '../supabase.js';
import App from '../main.js';

export class UserCheckout {
    constructor() {
        this.token = null;
        this.checkoutUrl = '';
        this.processingSteps = [
            { id: 'validate', label: 'Validating Token', icon: 'fa-shield-alt' },
            { id: 'credit', label: 'Checking Credits', icon: 'fa-coins' },
            { id: 'fetch', label: 'Fetching Card Details', icon: 'fa-credit-card' },
            { id: 'connect', label: 'Connecting to Stripe', icon: 'fa-plug' },
            { id: 'fill', label: 'Auto-filling Details', icon: 'fa-magic' },
            { id: 'process', label: 'Processing Payment', icon: 'fa-spinner' }
        ];
    }

    render() {
        const container = document.createElement('div');
        container.className = 'min-h-screen flex items-center justify-center p-4 fade-in';
        
        container.innerHTML = `
            <div class="w-full max-w-2xl">
                <!-- Header -->
                <div class="text-center mb-10">
                    <div class="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-4xl shadow-2xl animate-pulse">
                        <i class="fas fa-bolt text-white"></i>
                    </div>
                    <h1 class="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                        Auto Checkout
                    </h1>
                    <p class="text-xl text-gray-400">Paste your Stripe link & enter token</p>
                </div>

                <!-- Main Form -->
                <div class="glass-card p-8 md:p-10 mb-6">
                    <form id="checkoutForm" class="space-y-6">
                        <div class="gradient-border p-1">
                            <div class="bg-gray-900 rounded-xl p-1">
                                <label class="block text-sm font-medium mb-2 px-4 pt-4 text-gray-400">
                                    <i class="fas fa-link mr-2"></i>Stripe Checkout URL
                                </label>
                                <input type="url" id="checkoutUrl" class="input-god border-0 bg-transparent" 
                                    placeholder="https://checkout.stripe.com/pay/cs_live_..." required>
                            </div>
                        </div>

                        <div class="gradient-border p-1">
                            <div class="bg-gray-900 rounded-xl p-1">
                                <label class="block text-sm font-medium mb-2 px-4 pt-4 text-gray-400">
                                    <i class="fas fa-key mr-2"></i>Access Token
                                </label>
                                <input type="text" id="tokenInput" class="input-god border-0 bg-transparent font-mono" 
                                    placeholder="stk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" required>
                            </div>
                        </div>

                        <button type="submit" id="startBtn" class="btn-god w-full text-lg py-4 group">
                            <span class="relative z-10 flex items-center justify-center gap-3">
                                <i class="fas fa-rocket group-hover:animate-bounce"></i>
                                Start Auto Checkout
                                <i class="fas fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                    </form>

                    <!-- Processing Steps -->
                    <div id="processingArea" class="hidden mt-8">
                        <div class="h-1 w-full bg-gray-800 rounded-full mb-6 overflow-hidden">
                            <div id="progressBar" class="h-full bg-gradient-to-r from-indigo-500 to-pink-500 w-0 transition-all duration-500"></div>
                        </div>
                        <div class="processing-container" id="stepsContainer">
                            ${this.renderSteps()}
                        </div>
                    </div>

                    <!-- Result -->
                    <div id="resultArea" class="hidden mt-8 text-center">
                        <div id="resultIcon" class="text-6xl mb-4"></div>
                        <h3 id="resultTitle" class="text-2xl font-bold mb-2"></h3>
                        <p id="resultMessage" class="text-gray-400 mb-4"></p>
                        <button id="resetBtn" class="btn-god btn-secondary">
                            <i class="fas fa-redo mr-2"></i>Try Again
                        </button>
                    </div>
                </div>

                <!-- Footer -->
                <div class="text-center text-gray-500 text-sm">
                    <p>Secure • Fast • Automated</p>
                </div>
            </div>

            <!-- Hidden iframe for checkout -->
            <iframe id="checkoutFrame" class="hidden" sandbox="allow-same-origin allow-scripts allow-popups allow-forms"></iframe>
        `;

        this.attachEvents(container);
        return container;
    }

    renderSteps() {
        return this.processingSteps.map((step, index) => `
            <div class="process-step" data-step="${step.id}" data-index="${index}">
                <div class="step-icon">
                    <i class="fas ${step.icon}"></i>
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold text-lg">${step.label}</h4>
                    <p class="text-sm text-gray-500 step-status">Waiting...</p>
                </div>
                <div class="step-check hidden text-green-500 text-xl">
                    <i class="fas fa-check-circle"></i>
                </div>
            </div>
        `).join('');
    }

    attachEvents(container) {
        const form = container.querySelector('#checkoutForm');
        const processingArea = container.querySelector('#processingArea');
        const resultArea = container.querySelector('#resultArea');
        const progressBar = container.querySelector('#progressBar');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            this.checkoutUrl = container.querySelector('#checkoutUrl').value;
            const tokenValue = container.querySelector('#tokenInput').value;

            // Show processing
            form.classList.add('hidden');
            processingArea.classList.remove('hidden');

            try {
                // Step 1: Validate Token
                await this.updateStep('validate', 'active');
                const tokenData = await this.validateToken(tokenValue);
                await this.sleep(800);
                await this.updateStep('validate', 'completed');
                this.updateProgress(16);

                // Step 2: Check Credits
                await this.updateStep('credit', 'active');
                if (tokenData.credits_remaining <= 0) {
                    throw new Error('No credits remaining');
                }
                await this.sleep(600);
                await this.updateStep('credit', 'completed');
                this.updateProgress(32);

                // Step 3: Fetch Card
                await this.updateStep('fetch', 'active');
                const card = await this.fetchCard();
                if (!card) {
                    throw new Error('No cards available');
                }
                await this.sleep(800);
                await this.updateStep('fetch', 'completed');
                this.updateProgress(48);

                // Step 4: Connect to Stripe
                await this.updateStep('connect', 'active');
                await this.sleep(1000);
                await this.updateStep('connect', 'completed');
                this.updateProgress(64);

                // Step 5: Auto-fill (Simulated - in real app, this would open Stripe)
                await this.updateStep('fill', 'active');
                await this.simulateCheckout(card);
                await this.updateStep('fill', 'completed');
                this.updateProgress(80);

                // Step 6: Process
                await this.updateStep('process', 'active');
                await this.useCredit(tokenData.id);
                await this.sleep(1500);
                await this.updateStep('process', 'completed');
                this.updateProgress(100);

                // Show success
                this.showResult('success', 'Checkout Complete!', 'Payment processed successfully using virtual card.');

            } catch (err) {
                // Find active step and mark as error
                const activeStep = container.querySelector('.process-step.active');
                if (activeStep) {
                    activeStep.classList.remove('active');
                    activeStep.classList.add('error');
                    activeStep.querySelector('.step-icon').innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
                    activeStep.querySelector('.step-status').textContent = 'Failed';
                    activeStep.querySelector('.step-status').classList.add('text-red-500');
                }
                
                this.showResult('error', 'Checkout Failed', err.message);
            }
        });

        container.querySelector('#resetBtn').addEventListener('click', () => {
            // Reset form
            form.reset();
            form.classList.remove('hidden');
            processingArea.classList.add('hidden');
            resultArea.classList.add('hidden');
            
            // Reset steps
            container.querySelectorAll('.process-step').forEach(step => {
                step.classList.remove('active', 'completed', 'error');
                step.querySelector('.step-status').textContent = 'Waiting...';
                step.querySelector('.step-status').classList.remove('text-red-500');
                step.querySelector('.step-check').classList.add('hidden');
            });
            
            progressBar.style.width = '0%';
        });
    }

    async validateToken(tokenValue) {
        const { data, error } = await db.tokens()
            .select('*')
            .eq('token_value', tokenValue)
            .eq('is_active', true)
            .eq('is_revoked', false)
            .single();

        if (error || !data) {
            throw new Error('Invalid or revoked token');
        }

        if (data.expires_at && new Date(data.expires_at) < new Date()) {
            throw new Error('Token has expired');
        }

        return data;
    }

    async fetchCard() {
        // Get random active card
        const { data } = await db.cards()
            .select('*')
            .eq('is_active', true)
            .limit(1);
        
        return data?.[0] || null;
    }

    async simulateCheckout(card) {
        // In production, this would:
        // 1. Open the Stripe URL in a controlled environment
        // 2. Use Puppeteer or similar to fill the form
        // 3. Submit the payment
        
        console.log('Using card:', card.card_name, 'ending in', card.last_four);
        
        // Simulate API call to Netlify function
        const response = await fetch('/.netlify/functions/process-checkout', {
            method: 'POST',
            body: JSON.stringify({
                url: this.checkoutUrl,
                card: {
                    number: card.card_number,
                    expiry: `${card.expiry_month}/${card.expiry_year.slice(-2)}`,
                    cvc: card.cvc
                }
            })
        });

        if (!response.ok) {
            throw new Error('Payment processing failed');
        }

        return await response.json();
    }

    async useCredit(tokenId) {
        // Update token usage
        await db.tokens()
            .update({
                credits_remaining: supabase.raw('credits_remaining - 1'),
                credits_used: supabase.raw('credits_used + 1'),
                usage_count: supabase.raw('usage_count + 1'),
                last_used_at: new Date().toISOString()
            })
            .eq('id', tokenId);

        // Log usage
        await db.usage().insert({
            token_id: tokenId,
            checkout_url: this.checkoutUrl,
            used_at: new Date().toISOString(),
            status: 'success'
        });
    }

    async updateStep(stepId, status) {
        const step = document.querySelector(`[data-step="${stepId}"]`);
        if (!step) return;

        const statusText = step.querySelector('.step-status');
        const checkIcon = step.querySelector('.step-check');

        if (status === 'active') {
            step.classList.add('active');
            statusText.textContent = 'Processing...';
        } else if (status === 'completed') {
            step.classList.remove('active');
            step.classList.add('completed');
            statusText.textContent = 'Completed';
            statusText.classList.add('text-green-500');
            checkIcon.classList.remove('hidden');
        }
    }

    updateProgress(percent) {
        document.getElementById('progressBar').style.width = percent + '%';
    }

    showResult(type, title, message) {
        const processingArea = document.getElementById('processingArea');
        const resultArea = document.getElementById('resultArea');
        const resultIcon = document.getElementById('resultIcon');
        const resultTitle = document.getElementById('resultTitle');
        const resultMessage = document.getElementById('resultMessage');

        processingArea.classList.add('hidden');
        resultArea.classList.remove('hidden');

        if (type === 'success') {
            resultIcon.innerHTML = '<i class="fas fa-check-circle text-green-500 animate-bounce"></i>';
            resultTitle.className = 'text-2xl font-bold mb-2 text-green-500';
        } else {
            resultIcon.innerHTML = '<i class="fas fa-times-circle text-red-500 animate-pulse"></i>';
            resultTitle.className = 'text-2xl font-bold mb-2 text-red-500';
        }

        resultTitle.textContent = title;
        resultMessage.textContent = message;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
                                     }
