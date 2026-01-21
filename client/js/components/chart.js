import { stats, routines } from '../lib/api.js';

// Color palette for exercise lines
const COLORS = [
  '#0369a1', // blue
  '#15803d', // green
  '#dc2626', // red
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#be185d', // pink
  '#4d7c0f', // lime
];

export function createTrendsChart(container) {
  let granularity = 'day';
  let days = 30;
  let selectedRoutineId = null;
  let routineList = [];

  async function render() {
    // Load routines first
    try {
      routineList = await routines.list();
    } catch (e) {
      routineList = [];
    }

    container.innerHTML = `
      <div class="chart-container">
        <div class="chart-header">
          <div class="chart-title">Rep Trends</div>
          <div class="chart-controls">
            <button class="chart-control active" data-granularity="day">Day</button>
            <button class="chart-control" data-granularity="week">Week</button>
            <button class="chart-control" data-granularity="month">Month</button>
          </div>
        </div>
        <div id="chart-svg-container">
          <div class="text-center p-4">
            <div class="spinner" style="margin: 0 auto;"></div>
          </div>
        </div>
        <div id="chart-legend" class="chart-legend"></div>
        <div class="chart-routine-selector">
          <label class="chart-radio">
            <input type="radio" name="routine" value="" ${!selectedRoutineId ? 'checked' : ''}>
            <span>All</span>
          </label>
          ${routineList.map(r => `
            <label class="chart-radio">
              <input type="radio" name="routine" value="${r.id}" ${selectedRoutineId === r.id ? 'checked' : ''}>
              <span>${r.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;

    // Granularity control listeners
    container.querySelectorAll('.chart-control').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.chart-control').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        granularity = btn.dataset.granularity;

        // Adjust days based on granularity
        if (granularity === 'month') {
          days = 365;
        } else if (granularity === 'week') {
          days = 90;
        } else {
          days = 30;
        }

        loadData();
      });
    });

    // Routine selector listeners
    container.querySelectorAll('input[name="routine"]').forEach(radio => {
      radio.addEventListener('change', () => {
        selectedRoutineId = radio.value || null;
        loadData();
      });
    });

    await loadData();
  }

  async function loadData() {
    const svgContainer = container.querySelector('#chart-svg-container');
    const legendContainer = container.querySelector('#chart-legend');

    try {
      const options = { granularity, days };
      if (selectedRoutineId) {
        options.routineId = selectedRoutineId;
      }
      const data = await stats.trends(options);

      if (data.timeline.length === 0) {
        svgContainer.innerHTML = '<div class="empty-state">No data yet</div>';
        legendContainer.innerHTML = '';
        return;
      }

      // If a routine is selected, show per-exercise lines
      if (selectedRoutineId && data.exercises.length > 0) {
        renderMultiLineChart(svgContainer, legendContainer, data);
      } else {
        renderChart(svgContainer, data.timeline);
        legendContainer.innerHTML = '';
      }
    } catch (error) {
      console.error('Failed to load trends:', error);
      svgContainer.innerHTML = '<div class="empty-state">Failed to load</div>';
      legendContainer.innerHTML = '';
    }
  }

  function renderMultiLineChart(svgContainer, legendContainer, data) {
    const width = svgContainer.clientWidth || 300;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max across all exercises
    const allReps = data.exercises.flatMap(ex => ex.data.map(d => d.reps));
    const maxReps = Math.max(...allReps, 1);
    const minReps = 0;

    const periods = data.timeline.map(t => t.period);

    // Scale functions
    const xScale = (i) => padding.left + (i / (periods.length - 1 || 1)) * chartWidth;
    const yScale = (val) => padding.top + (1 - (val - minReps) / (maxReps - minReps || 1)) * chartHeight;

    // Y-axis labels
    const yLabels = [];
    const numYLabels = 5;
    for (let i = 0; i < numYLabels; i++) {
      const val = Math.round(minReps + (maxReps - minReps) * (1 - i / (numYLabels - 1)));
      yLabels.push({ val, y: padding.top + (i / (numYLabels - 1)) * chartHeight });
    }

    // X-axis labels
    const xLabels = [];
    if (periods.length > 0) {
      xLabels.push({ label: formatLabel(periods[0]), x: xScale(0) });
      if (periods.length > 2) {
        const mid = Math.floor(periods.length / 2);
        xLabels.push({ label: formatLabel(periods[mid]), x: xScale(mid) });
      }
      if (periods.length > 1) {
        xLabels.push({ label: formatLabel(periods[periods.length - 1]), x: xScale(periods.length - 1) });
      }
    }

    // Generate lines for each exercise
    const exerciseLines = data.exercises.map((ex, idx) => {
      const color = COLORS[idx % COLORS.length];
      const points = ex.data.map((d, i) => `${xScale(i)},${yScale(d.reps)}`).join(' ');
      return { ...ex, color, points };
    });

    svgContainer.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <!-- Grid lines -->
        ${yLabels.map(l => `
          <line class="chart-grid-line" x1="${padding.left}" y1="${l.y}" x2="${width - padding.right}" y2="${l.y}"/>
        `).join('')}

        <!-- Exercise lines -->
        ${exerciseLines.map(ex => `
          <polyline fill="none" stroke="${ex.color}" stroke-width="2" points="${ex.points}"/>
        `).join('')}

        <!-- Dots -->
        ${exerciseLines.flatMap(ex =>
          ex.data.map((d, i) => `
            <circle cx="${xScale(i)}" cy="${yScale(d.reps)}" r="3" fill="${ex.color}">
              <title>${ex.name} - ${d.period}: ${d.reps} reps</title>
            </circle>
          `)
        ).join('')}

        <!-- Y-axis labels -->
        ${yLabels.map(l => `
          <text class="chart-label" x="${padding.left - 8}" y="${l.y + 4}" text-anchor="end">${l.val}</text>
        `).join('')}

        <!-- X-axis labels -->
        ${xLabels.map(l => `
          <text class="chart-label" x="${l.x}" y="${height - 8}" text-anchor="middle">${l.label}</text>
        `).join('')}

        <!-- Axes -->
        <line class="chart-axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"/>
        <line class="chart-axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"/>
      </svg>
    `;

    // Render legend
    legendContainer.innerHTML = exerciseLines.map(ex => `
      <div class="chart-legend-item">
        <span class="chart-legend-color" style="background: ${ex.color}"></span>
        <span class="chart-legend-label">${ex.name}</span>
      </div>
    `).join('');
  }

  function renderChart(svgContainer, timeline) {
    const width = svgContainer.clientWidth || 300;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const maxReps = Math.max(...timeline.map(d => d.totalReps), 1);
    const minReps = 0;

    // Scale functions
    const xScale = (i) => padding.left + (i / (timeline.length - 1 || 1)) * chartWidth;
    const yScale = (val) => padding.top + (1 - (val - minReps) / (maxReps - minReps || 1)) * chartHeight;

    // Generate path
    const linePoints = timeline.map((d, i) => `${xScale(i)},${yScale(d.totalReps)}`).join(' ');

    // Generate area
    const areaPath = `
      M ${xScale(0)},${yScale(0)}
      L ${timeline.map((d, i) => `${xScale(i)},${yScale(d.totalReps)}`).join(' L ')}
      L ${xScale(timeline.length - 1)},${yScale(0)}
      Z
    `;

    // Y-axis labels
    const yLabels = [];
    const numYLabels = 5;
    for (let i = 0; i < numYLabels; i++) {
      const val = Math.round(minReps + (maxReps - minReps) * (1 - i / (numYLabels - 1)));
      yLabels.push({ val, y: padding.top + (i / (numYLabels - 1)) * chartHeight });
    }

    // X-axis labels (show first, middle, last)
    const xLabels = [];
    if (timeline.length > 0) {
      xLabels.push({ label: formatLabel(timeline[0].period), x: xScale(0) });
      if (timeline.length > 2) {
        const mid = Math.floor(timeline.length / 2);
        xLabels.push({ label: formatLabel(timeline[mid].period), x: xScale(mid) });
      }
      if (timeline.length > 1) {
        xLabels.push({ label: formatLabel(timeline[timeline.length - 1].period), x: xScale(timeline.length - 1) });
      }
    }

    svgContainer.innerHTML = `
      <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        <!-- Grid lines -->
        ${yLabels.map(l => `
          <line class="chart-grid-line" x1="${padding.left}" y1="${l.y}" x2="${width - padding.right}" y2="${l.y}"/>
        `).join('')}

        <!-- Area -->
        <path class="chart-area" d="${areaPath}"/>

        <!-- Line -->
        <polyline class="chart-line" points="${linePoints}"/>

        <!-- Dots -->
        ${timeline.map((d, i) => `
          <circle class="chart-dot" cx="${xScale(i)}" cy="${yScale(d.totalReps)}" r="3">
            <title>${d.period}: ${d.totalReps} reps</title>
          </circle>
        `).join('')}

        <!-- Y-axis labels -->
        ${yLabels.map(l => `
          <text class="chart-label" x="${padding.left - 8}" y="${l.y + 4}" text-anchor="end">${l.val}</text>
        `).join('')}

        <!-- X-axis labels -->
        ${xLabels.map(l => `
          <text class="chart-label" x="${l.x}" y="${height - 8}" text-anchor="middle">${l.label}</text>
        `).join('')}

        <!-- Axes -->
        <line class="chart-axis-line" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}"/>
        <line class="chart-axis-line" x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}"/>
      </svg>
    `;
  }

  function formatLabel(period) {
    if (period.includes('W')) {
      // Week format: 2024-W05
      return period.split('-')[1];
    } else if (period.match(/^\d{4}-\d{2}$/)) {
      // Month format: 2024-01
      const [, month] = period.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return months[parseInt(month) - 1];
    } else {
      // Day format: 2024-01-15
      const [, month, day] = period.split('-');
      return `${parseInt(month)}/${parseInt(day)}`;
    }
  }

  render();

  return { refresh: loadData };
}

export default { createTrendsChart };
