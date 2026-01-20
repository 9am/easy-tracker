import { stats } from '../lib/api.js';
import { icons, formatDate } from '../lib/utils.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

async function showDayDetail(date) {
  try {
    const data = await stats.general(date);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h3>${formatDate(date, { weekday: 'short', year: 'numeric' })}</h3>
          <button class="modal-close">${icons.x}</button>
        </div>
        <div class="modal-body">
          ${data.today.totalReps === 0 ? `
            <div class="empty-state">
              <p>No activity on this day</p>
            </div>
          ` : `
            <div class="day-detail-summary">
              <span class="font-medium">${data.today.totalReps} reps</span>
              <span class="text-muted"> · ${data.today.totalSets} sets</span>
            </div>
            <div class="day-detail-routines">
              ${data.today.routines.map(routine => `
                <div class="day-detail-routine">
                  <div class="day-detail-routine-header">
                    <span class="font-medium">${routine.name}</span>
                    <span class="text-muted">${routine.totalReps} reps</span>
                  </div>
                  <div class="day-detail-exercises">
                    ${routine.exercises.map(ex => `
                      <div class="day-detail-exercise">
                        <div>
                          <div class="day-detail-exercise-name">${ex.name}</div>
                          <div class="day-detail-exercise-muscle">${ex.muscleGroup}</div>
                        </div>
                        <div class="day-detail-exercise-stats">
                          <span>${ex.reps} reps</span>
                          <span class="text-muted">${ex.sets} set${ex.sets !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    const close = () => overlay.remove();
    overlay.querySelector('.modal-close').onclick = close;
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    document.body.appendChild(overlay);
  } catch (error) {
    console.error('Failed to load day details:', error);
  }
}

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
      daysContainer.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          showDayDetail(el.dataset.date);
        });
      });

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
