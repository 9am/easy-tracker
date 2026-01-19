import { stats } from '../lib/api.js';
import { icons } from '../lib/utils.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function createCalendar(container, onDayClick) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  async function render() {
    container.innerHTML = `
      <div class="calendar">
        <div class="calendar-header">
          <div class="calendar-nav">
            <button class="calendar-nav-btn" id="cal-prev">${icons.chevronLeft}</button>
          </div>
          <div class="calendar-title">${MONTHS[month - 1]} ${year}</div>
          <div class="calendar-nav">
            <button class="calendar-nav-btn" id="cal-next">${icons.chevronRight}</button>
          </div>
        </div>
        <div class="calendar-grid">
          ${WEEKDAYS.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
          <div id="calendar-days" style="display: contents;"></div>
        </div>
        <div class="p-4" id="calendar-summary"></div>
      </div>
    `;

    // Navigation listeners
    container.querySelector('#cal-prev').addEventListener('click', () => {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      loadData();
    });

    container.querySelector('#cal-next').addEventListener('click', () => {
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
      loadData();
    });

    await loadData();
  }

  async function loadData() {
    const daysContainer = container.querySelector('#calendar-days');
    const summaryContainer = container.querySelector('#calendar-summary');
    const titleEl = container.querySelector('.calendar-title');

    titleEl.textContent = `${MONTHS[month - 1]} ${year}`;

    try {
      const data = await stats.calendar(year, month);

      // Render days
      const firstDay = new Date(year, month - 1, 1).getDay();
      const today = new Date();
      const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

      let html = '';

      // Empty cells for days before first of month
      for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
      }

      // Days of month
      for (const day of data.days) {
        const isToday = isCurrentMonth && day.day === today.getDate();
        const classes = ['calendar-day', `intensity-${day.intensity}`];
        if (isToday) classes.push('today');

        html += `<div class="${classes.join(' ')}" data-date="${day.date}" title="${day.reps} reps">${day.day}</div>`;
      }

      daysContainer.innerHTML = html;

      // Add click listeners
      if (onDayClick) {
        daysContainer.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => {
            onDayClick(el.dataset.date);
          });
        });
      }

      // Summary
      summaryContainer.innerHTML = `
        <div class="flex justify-between text-sm">
          <span class="text-muted">Active days</span>
          <span class="font-medium">${data.summary.activeDays} / ${data.days.length}</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span class="text-muted">Total reps</span>
          <span class="font-medium">${data.summary.totalReps.toLocaleString()}</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span class="text-muted">Avg per active day</span>
          <span class="font-medium">${data.summary.averageRepsPerDay}</span>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load calendar:', error);
      daysContainer.innerHTML = '<div class="empty-state">Failed to load</div>';
    }
  }

  render();

  return { refresh: loadData };
}

export default { createCalendar };
