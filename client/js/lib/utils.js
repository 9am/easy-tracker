// Utility functions

// Toast notifications
let toastContainer = null;

export function toast(message, type = 'default') {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const toastEl = document.createElement('div');
  toastEl.className = `toast toast-${type}`;
  toastEl.textContent = message;

  toastContainer.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.opacity = '0';
    setTimeout(() => toastEl.remove(), 200);
  }, 3000);
}

// Format date
export function formatDate(date, options = {}) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: options.year ? 'numeric' : undefined,
    ...options
  });
}

// Format relative time
export function formatRelativeTime(date) {
  const now = new Date();
  const d = new Date(date);
  const diff = now - d;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(date);
}

// Debounce
export function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// Get exercise name from exercise object
export function getExerciseName(exercise) {
  return exercise.predefinedExercise?.name || exercise.customName || 'Unknown';
}

// Get muscle group from exercise object
export function getMuscleGroup(exercise) {
  return exercise.predefinedExercise?.muscleGroup?.name || 'Custom';
}

// Create element helper
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'onclick' || key === 'oninput' || key === 'onchange') {
      el.addEventListener(key.slice(2), value);
    } else if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        el.dataset[dataKey] = dataValue;
      }
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else {
      el.setAttribute(key, value);
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      el.appendChild(document.createTextNode(child));
    } else if (child) {
      el.appendChild(child);
    }
  }

  return el;
}

// Confirm popover
export function confirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-popover">
        <div class="confirm-message">${message}</div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="confirm">Confirm</button>
        </div>
      </div>
    `;

    const close = (result) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('[data-action="cancel"]').onclick = () => close(false);
    overlay.querySelector('[data-action="confirm"]').onclick = () => close(true);
    overlay.onclick = (e) => {
      if (e.target === overlay) close(false);
    };

    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="confirm"]').focus();
  });
}

// SVG Icons
export const icons = {
  plus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,

  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,

  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,

  chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,

  x: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,

  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,

  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,

  workout: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M6 12h12M2 8h4M2 16h4M18 8h4M18 16h4"></path></svg>`,

  user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,

  google: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,

  logout: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`
};

// Exercise icons - simple gesture representations
export const exerciseIcons = {
  // Chest
  'Push-ups': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="18" x2="20" y2="18"/><path d="M6 14 L12 10 L18 14"/><circle cx="12" cy="7" r="2"/></svg>`,
  'Bench Press': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><line x1="4" y1="8" x2="4" y2="16"/><line x1="20" y1="8" x2="20" y2="16"/><ellipse cx="12" cy="12" rx="4" ry="2"/></svg>`,
  'Chest Fly': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="2"/><path d="M4 14 Q8 10 12 12 Q16 10 20 14"/><line x1="4" y1="14" x2="4" y2="18"/><line x1="20" y1="14" x2="20" y2="18"/></svg>`,
  'Incline Press': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="2" y1="16" x2="22" y2="10"/><line x1="4" y1="12" x2="4" y2="20"/><line x1="20" y1="6" x2="20" y2="14"/><ellipse cx="12" cy="13" rx="3" ry="1.5"/></svg>`,

  // Back
  'Pull-ups': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="4"/><circle cx="12" cy="9" r="2"/><line x1="12" y1="11" x2="12" y2="16"/><path d="M8 4 L8 7 M16 4 L16 7"/><path d="M9 16 L12 20 L15 16"/></svg>`,
  'Rows': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="10" r="2"/><line x1="8" y1="12" x2="8" y2="18"/><path d="M6 18 L10 18"/><line x1="10" y1="12" x2="18" y2="12"/><line x1="18" y1="10" x2="18" y2="14"/></svg>`,
  'Lat Pulldown': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="4" x2="20" y2="4"/><circle cx="12" cy="10" r="2"/><path d="M4 4 L8 12 M20 4 L16 12"/><line x1="12" y1="12" x2="12" y2="18"/></svg>`,
  'Deadlift': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="2"/><line x1="12" y1="8" x2="12" y2="14"/><path d="M9 14 L9 20 M15 14 L15 20"/><line x1="6" y1="20" x2="18" y2="20"/><circle cx="6" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>`,

  // Shoulders
  'Overhead Press': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="2"/><line x1="12" y1="12" x2="12" y2="18"/><path d="M6 6 L12 4 L18 6"/><line x1="6" y1="4" x2="6" y2="8"/><line x1="18" y1="4" x2="18" y2="8"/></svg>`,
  'Lateral Raise': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="2"/><line x1="12" y1="10" x2="12" y2="18"/><line x1="12" y1="12" x2="4" y2="10"/><line x1="12" y1="12" x2="20" y2="10"/><circle cx="4" cy="10" r="1"/><circle cx="20" cy="10" r="1"/></svg>`,
  'Front Raise': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="2"/><line x1="12" y1="12" x2="12" y2="20"/><line x1="10" y1="12" x2="6" y2="6"/><line x1="14" y1="12" x2="18" y2="6"/><circle cx="6" cy="6" r="1"/><circle cx="18" cy="6" r="1"/></svg>`,
  'Shrugs': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="2"/><line x1="12" y1="10" x2="12" y2="16"/><path d="M8 10 Q8 6 12 6 Q16 6 16 10"/><line x1="8" y1="10" x2="8" y2="18"/><line x1="16" y1="10" x2="16" y2="18"/></svg>`,

  // Arms
  'Bicep Curl': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 18 L8 12 Q8 8 12 8"/><circle cx="12" cy="6" r="1.5"/><line x1="8" y1="18" x2="8" y2="20"/><circle cx="8" cy="20" r="1"/></svg>`,
  'Tricep Dip': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="8" x2="20" y2="8"/><circle cx="12" cy="12" r="2"/><path d="M8 8 L8 12 M16 8 L16 12"/><line x1="12" y1="14" x2="12" y2="18"/><path d="M10 18 L14 18"/></svg>`,
  'Hammer Curl': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 18 L10 12 L10 8"/><rect x="8" y="6" width="4" height="3" rx="1"/><line x1="10" y1="18" x2="10" y2="20"/></svg>`,
  'Skull Crusher': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="14" x2="20" y2="14"/><circle cx="12" cy="10" r="2"/><path d="M8 14 L6 8 M16 14 L18 8"/><circle cx="6" cy="8" r="1"/><circle cx="18" cy="8" r="1"/></svg>`,

  // Core
  'Plank': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="14" x2="18" y2="14"/><circle cx="18" cy="12" r="2"/><line x1="4" y1="14" x2="4" y2="18"/><line x1="8" y1="14" x2="8" y2="18"/></svg>`,
  'Crunches': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 18 Q8 14 12 14"/><circle cx="14" cy="12" r="2"/><path d="M12 14 L8 18"/><line x1="4" y1="18" x2="8" y2="18"/></svg>`,
  'Leg Raise': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="16" x2="12" y2="16"/><circle cx="4" cy="14" r="2"/><path d="M12 16 L18 8"/><line x1="18" y1="8" x2="20" y2="8"/></svg>`,
  'Russian Twist': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="2"/><path d="M8 18 L12 12 L16 18"/><path d="M8 12 L16 12" stroke-dasharray="2 2"/><circle cx="6" cy="12" r="1"/><circle cx="18" cy="12" r="1"/></svg>`,

  // Legs
  'Squats': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="2"/><line x1="12" y1="8" x2="12" y2="12"/><path d="M8 12 L8 16 L10 20 M16 12 L16 16 L14 20"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
  'Lunges': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="6" r="2"/><line x1="10" y1="8" x2="10" y2="12"/><path d="M10 12 L6 18 L6 20"/><path d="M10 12 L16 16 L18 20"/></svg>`,
  'Leg Press': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="12" r="2"/><path d="M8 12 L12 12 L16 8"/><line x1="16" y1="8" x2="20" y2="8"/><line x1="20" y1="6" x2="20" y2="10"/><path d="M6 14 L6 18"/></svg>`,
  'Calf Raise': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="6" r="2"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="10" y1="14" x2="14" y2="14"/><path d="M10 14 L10 18 L10 20 M14 14 L14 18 L14 20"/><line x1="8" y1="20" x2="16" y2="20"/></svg>`,

  // Cardio
  'Running': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="14" cy="6" r="2"/><path d="M10 10 L14 8 L18 10"/><path d="M14 10 L12 16 L8 20"/><path d="M14 10 L16 14 L20 16"/></svg>`,
  'Jumping Jacks': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><line x1="12" y1="7" x2="12" y2="14"/><path d="M12 10 L6 6 M12 10 L18 6"/><path d="M12 14 L8 20 M12 14 L16 20"/></svg>`,
  'Burpees': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="2"/><path d="M10 8 L16 8 L16 12 L4 12"/><path d="M4 12 L4 16 M8 12 L8 16"/><path d="M17 6 L20 3 M17 6 L20 9" stroke-dasharray="2 2"/></svg>`,
  'Mountain Climbers': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="10" r="2"/><line x1="8" y1="10" x2="18" y2="14"/><path d="M10 12 L8 18"/><path d="M14 12 L18 8"/><line x1="18" y1="14" x2="18" y2="18"/></svg>`,

  // Default/Custom
  'default': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"/><line x1="12" y1="11" x2="12" y2="16"/><path d="M8 20 L12 16 L16 20"/><path d="M8 13 L16 13"/></svg>`
};

// Get exercise icon by name
export function getExerciseIcon(name) {
  return exerciseIcons[name] || exerciseIcons['default'];
}

export default { toast, formatDate, formatRelativeTime, debounce, getExerciseName, getMuscleGroup, createElement, confirm, icons, exerciseIcons, getExerciseIcon };
