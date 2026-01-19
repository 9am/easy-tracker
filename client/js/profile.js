import '../css/base.css';
import '../css/components.css';
import { requireAuth, getUser, logout } from './lib/auth.js';
import { stats } from './lib/api.js';
import { toast, formatDate } from './lib/utils.js';
import { initNav } from './components/nav.js';
import { initFab } from './components/fab.js';
import { createCalendar } from './components/calendar.js';
import { createTrendsChart } from './components/chart.js';

let currentTab = 'general';

async function init() {
  const authenticated = await requireAuth();
  if (!authenticated) return;

  const user = getUser();
  renderUserInfo(user);

  initNav();
  await initFab();

  setupTabs();
  loadTab('general');

  // Logout button
  document.getElementById('logout-btn').addEventListener('click', async () => {
    if (confirm('Log out?')) {
      await logout();
    }
  });

  // Refresh stats when a set is logged
  window.addEventListener('setLogged', () => {
    loadTab(currentTab);
  });
}

function renderUserInfo(user) {
  const name = user.name || user.email.split('@')[0];
  document.getElementById('user-name').textContent = name;
  document.getElementById('user-email').textContent = user.email;

  const avatar = document.getElementById('avatar');
  if (user.avatarUrl) {
    avatar.innerHTML = `<img src="${user.avatarUrl}" alt="${name}">`;
  } else {
    document.getElementById('avatar-initial').textContent = name.charAt(0).toUpperCase();
  }
}

function setupTabs() {
  document.querySelectorAll('.stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.stats-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadTab(tab.dataset.tab);
    });
  });
}

async function loadTab(tab) {
  currentTab = tab;
  const container = document.getElementById('stats-content');

  switch (tab) {
    case 'general':
      await renderGeneralStats(container);
      break;
    case 'calendar':
      renderCalendarView(container);
      break;
    case 'trends':
      renderTrendsView(container);
      break;
  }
}

async function renderGeneralStats(container) {
  container.innerHTML = `
    <div class="text-center p-4">
      <div class="spinner" style="margin: 0 auto;"></div>
    </div>
  `;

  try {
    const data = await stats.general();

    const setsChange = data.today.totalSets - data.comparison.yesterday.totalSets;
    const repsChange = data.today.totalReps - data.comparison.yesterday.totalReps;

    container.innerHTML = `
      <div class="stats-summary">
        <div class="stat-card">
          <div class="stat-value">${data.today.totalSets}</div>
          <div class="stat-label">Sets today</div>
          ${renderComparison(setsChange, 'vs yesterday')}
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.today.totalReps}</div>
          <div class="stat-label">Reps today</div>
          ${renderComparison(repsChange, 'vs yesterday')}
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.comparison.weeklyAverage.totalSets}</div>
          <div class="stat-label">Avg sets/day</div>
          <div class="stat-comparison text-muted">last 7 days</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.comparison.weeklyAverage.totalReps}</div>
          <div class="stat-label">Avg reps/day</div>
          <div class="stat-comparison text-muted">last 7 days</div>
        </div>
      </div>

      ${data.today.exercises.length > 0 ? `
        <div class="card">
          <div class="card-header">
            <strong>Today's Breakdown</strong>
          </div>
          <div class="exercise-breakdown">
            ${data.today.exercises.map(ex => `
              <div class="breakdown-item">
                <div>
                  <div class="breakdown-name">${ex.name}</div>
                  <div class="breakdown-muscle">${ex.muscleGroup}</div>
                </div>
                <div class="breakdown-stats">
                  <div class="breakdown-reps">${ex.reps} reps</div>
                  <div class="breakdown-sets">${ex.sets} set${ex.sets !== 1 ? 's' : ''}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="empty-state">
          <p>No sets logged today.</p>
          <p class="text-sm text-muted">Tap the + button to start logging.</p>
        </div>
      `}
    `;
  } catch (error) {
    console.error('Failed to load stats:', error);
    container.innerHTML = '<div class="empty-state">Failed to load statistics</div>';
  }
}

function renderComparison(change, label) {
  if (change === 0) {
    return `<div class="stat-comparison text-muted">same ${label}</div>`;
  }
  const className = change > 0 ? 'stat-up' : 'stat-down';
  const prefix = change > 0 ? '+' : '';
  return `<div class="stat-comparison ${className}">${prefix}${change} ${label}</div>`;
}

function renderCalendarView(container) {
  container.innerHTML = '<div id="calendar-container"></div>';
  const calContainer = container.querySelector('#calendar-container');

  createCalendar(calContainer, (date) => {
    // Show day details in a toast for now
    toast(`Selected: ${formatDate(date)}`);
  });
}

function renderTrendsView(container) {
  container.innerHTML = '<div id="chart-container"></div>';
  const chartContainer = container.querySelector('#chart-container');

  createTrendsChart(chartContainer);
}

// Initialize
init();
