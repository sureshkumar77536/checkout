import { Auth } from './components/Auth.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { UserCheckout } from './components/UserCheckout.js';
import { supabase } from './supabase.js';

class App {
    constructor() {
        this.app = document.getElementById('app');
        this.currentUser = null;
        this.init();
    }

    async init() {
        this.initParticles();
        await this.checkSession();
        this.setupAuthListener();
    }

    initParticles() {
        const canvas = document.getElementById('particles');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles = [];
        const particleCount = 100;

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 1;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
                this.opacity = Math.random() * 0.5 + 0.1;
            }

            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;
            }

            draw() {
                ctx.fillStyle = `rgba(99, 102, 241, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        for (let i = 0; i < particleCount; i++) {
            particles.push(new Particle());
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animate);
        }

        animate();

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }

    async checkSession() {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
            const { data: admin } = await supabase
                .from('admins')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (admin) {
                this.currentUser = admin;
                this.showAdminDashboard();
            } else {
                this.showUserCheckout();
            }
        } else {
            this.showAuth();
        }
    }

    setupAuthListener() {
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.checkSession();
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.showAuth();
            }
        });
    }

    showAuth() {
        this.app.innerHTML = '';
        const auth = new Auth();
        this.app.appendChild(auth.render());
    }

    showAdminDashboard() {
        this.app.innerHTML = '';
        const dashboard = new AdminDashboard(this.currentUser);
        this.app.appendChild(dashboard.render());
    }

    showUserCheckout() {
        this.app.innerHTML = '';
        const checkout = new UserCheckout();
        this.app.appendChild(checkout.render());
    }

    // Toast notification helper
    static showToast(message, type = 'info') {
        const container = document.querySelector('.toast-container') || (() => {
            const div = document.createElement('div');
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
}

// Initialize App
new App();
export default App;
