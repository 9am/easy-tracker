import { icons } from '../lib/utils.js';

const NAV_ITEMS = [
  { href: '/pages/workout.html', icon: icons.workout, label: 'Workout' },
  { href: '/pages/profile.html', icon: icons.user, label: 'Profile' }
];

export function createNav() {
  const currentPath = window.location.pathname;

  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  for (const item of NAV_ITEMS) {
    const isActive = currentPath === item.href ||
      currentPath.includes(item.href.replace('.html', ''));

    const link = document.createElement('a');
    link.href = item.href;
    link.className = `nav-item${isActive ? ' active' : ''}`;

    if (isActive) {
      link.addEventListener('click', (e) => e.preventDefault());
    }

    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'nav-icon';
    iconWrapper.innerHTML = item.icon;

    const label = document.createElement('span');
    label.textContent = item.label;

    link.appendChild(iconWrapper);
    link.appendChild(label);
    nav.appendChild(link);
  }

  return nav;
}

export function initNav() {
  const existing = document.querySelector('.bottom-nav');
  if (existing) existing.remove();

  document.body.appendChild(createNav());
}

export default { createNav, initNav };
