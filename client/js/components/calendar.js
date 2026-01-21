import { stats } from '../lib/api.js';
import { icons, formatDate } from '../lib/utils.js';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function showDayDetail(dayData) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3>${formatDate(dayData.date, { weekday: 'short', year: 'numeric' })}</h3>
        <button class="modal-close">${icons.x}</button>
      </div>
      <div class="modal-body">
        ${dayData.reps === 0 ? `
          <div class="empty-state">
            <p>No activity on this day</p>
          </div>
        ` : `
          <div class="day-detail-summary">
            <span class="font-medium">${dayData.reps} reps</span>
            <span class="text-muted"> · ${dayData.sets} sets</span>
          </div>
          <div class="day-detail-routines">
            ${dayData.routines.map(routine => `
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
}

export function createCalendar(container, onDayClick) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let cachedDays = {};
  let rawDays = [];
  let allRoutines = [];
  let selectedRoutineId = 'all';

  function getFilteredDayData(day) {
    if (selectedRoutineId === 'all') {
      return day;
    }
    // Filter to selected routine only
    const filteredRoutines = day.routines.filter(r => r.name === selectedRoutineId);
    const totalReps = filteredRoutines.reduce((sum, r) => sum + r.totalReps, 0);
    const totalSets = filteredRoutines.reduce((sum, r) => sum + r.totalSets, 0);
    return {
      ...day,
      reps: totalReps,
      sets: totalSets,
      routines: filteredRoutines
    };
  }

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
        <div class="calendar-filter" id="calendar-filter"></div>
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
    const filterContainer = container.querySelector('#calendar-filter');
    const titleEl = container.querySelector('.calendar-title');

    titleEl.textContent = `${MONTHS[month - 1]} ${year}`;

    try {
      const data = await stats.calendar(year, month);
      rawDays = data.days;

      // Extract unique routines from all days
      const routineSet = new Set();
      for (const day of rawDays) {
        for (const routine of day.routines) {
          routineSet.add(routine.name);
        }
      }
      allRoutines = Array.from(routineSet).sort();

      // Render filter if there are routines
      renderFilter(filterContainer);

      // Render calendar with current filter
      renderCalendarDays(daysContainer, summaryContainer);
    } catch (error) {
      console.error('Failed to load calendar:', error);
      daysContainer.innerHTML = '<div class="empty-state">Failed to load</div>';
    }
  }

  function renderFilter(filterContainer) {
    if (allRoutines.length === 0) {
      filterContainer.innerHTML = '';
      return;
    }

    filterContainer.innerHTML = `
      <div class="calendar-filter-options">
        <label class="calendar-filter-option">
          <input type="radio" name="routine-filter" value="all" ${selectedRoutineId === 'all' ? 'checked' : ''}>
          <span>All</span>
        </label>
        ${allRoutines.map(name => `
          <label class="calendar-filter-option">
            <input type="radio" name="routine-filter" value="${name}" ${selectedRoutineId === name ? 'checked' : ''}>
            <span>${name}</span>
          </label>
        `).join('')}
      </div>
    `;

    // Add filter change listeners
    filterContainer.querySelectorAll('input[name="routine-filter"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        selectedRoutineId = e.target.value;
        const daysContainer = container.querySelector('#calendar-days');
        const summaryContainer = container.querySelector('#calendar-summary');
        renderCalendarDays(daysContainer, summaryContainer);
      });
    });
  }

  function renderCalendarDays(daysContainer, summaryContainer) {
    // Cache filtered days data keyed by date
    cachedDays = {};
    for (const day of rawDays) {
      cachedDays[day.date] = getFilteredDayData(day);
    }

    // Calculate max reps for intensity scaling (based on filtered data)
    const filteredDays = Object.values(cachedDays);
    const maxDayReps = Math.max(...filteredDays.map(d => d.reps), 1);

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
    for (const day of filteredDays) {
      const isToday = isCurrentMonth && day.day === today.getDate();
      const intensity = day.reps > 0 ? Math.ceil((day.reps / maxDayReps) * 4) : 0;
      const classes = ['calendar-day', `intensity-${intensity}`];
      if (isToday) classes.push('today');

      html += `<div class="${classes.join(' ')}" data-date="${day.date}" title="${day.reps} reps">${day.day}</div>`;
    }

    daysContainer.innerHTML = html;

    // Add click listeners using cached data
    daysContainer.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const dayData = cachedDays[el.dataset.date];
        if (dayData) {
          showDayDetail(dayData);
        }
      });
    });

    // Calculate summary based on filtered data
    const activeDays = filteredDays.filter(d => d.reps > 0).length;
    const totalReps = filteredDays.reduce((sum, d) => sum + d.reps, 0);
    const avgReps = activeDays > 0 ? Math.round(totalReps / activeDays) : 0;

    summaryContainer.innerHTML = `
      <div class="flex justify-between text-sm">
        <span class="text-muted">Active days</span>
        <span class="font-medium">${activeDays} / ${filteredDays.length}</span>
      </div>
      <div class="flex justify-between text-sm mt-2">
        <span class="text-muted">Total reps</span>
        <span class="font-medium">${totalReps.toLocaleString()}</span>
      </div>
      <div class="flex justify-between text-sm mt-2">
        <span class="text-muted">Avg per active day</span>
        <span class="font-medium">${avgReps}</span>
      </div>
    `;
  }

  render();

  return { refresh: loadData };
}

export default { createCalendar };
