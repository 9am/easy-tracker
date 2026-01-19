import '../css/base.css';
import '../css/components.css';
import { checkAuth, login, devLogin } from './lib/auth.js';
import { toast } from './lib/utils.js';

const loginButtons = document.getElementById('login-buttons');
const loading = document.getElementById('loading');
const googleBtn = document.getElementById('google-login');
const devBtn = document.getElementById('dev-login');

// Show loading
loginButtons.classList.add('hidden');
loading.classList.remove('hidden');

// Check if already authenticated
checkAuth().then(user => {
  if (user) {
    window.location.href = '/pages/workout.html';
  } else {
    loginButtons.classList.remove('hidden');
    loading.classList.add('hidden');

    // Show dev login in development
    if (import.meta.env.DEV) {
      devBtn.style.display = 'block';
    }
  }
}).catch(error => {
  console.error('Auth check failed:', error);
  loginButtons.classList.remove('hidden');
  loading.classList.add('hidden');

  if (import.meta.env.DEV) {
    devBtn.style.display = 'block';
  }
});

// Google login
googleBtn.addEventListener('click', () => {
  login();
});

// Dev login
devBtn.addEventListener('click', async () => {
  try {
    devBtn.disabled = true;
    devBtn.textContent = 'Logging in...';
    await devLogin();
    window.location.href = '/pages/workout.html';
  } catch (error) {
    console.error('Dev login failed:', error);
    devBtn.disabled = false;
    devBtn.textContent = 'Dev Login (Test User)';
  }
});

// Check for error in URL
const params = new URLSearchParams(window.location.search);
const error = params.get('error');
if (error) {
  toast('Login failed: ' + error, 'error');
}
