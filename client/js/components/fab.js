import { routines, sets } from '../lib/api.js';
import { toast, icons, getExerciseName, getMuscleGroup } from '../lib/utils.js';

let fabElement = null;
let panelElement = null;
let backdropElement = null;
let isExpanded = false;
let routineData = [];
let selectedExercise = null;
let lastSetData = null;

export async function initFab() {
  // Remove existing
  if (fabElement) fabElement.remove();
  if (panelElement) panelElement.remove();
  if (backdropElement) backdropElement.remove();

  // Create FAB button
  fabElement = document.createElement('button');
  fabElement.className = 'fab';
  fabElement.innerHTML = `<span class="fab-icon">${icons.plus}</span>`;
  fabElement.addEventListener('click', toggleFab);

  document.body.appendChild(fabElement);

  // Load routine data
  try {
    routineData = await routines.list();
  } catch (error) {
    console.error('Failed to load routines:', error);
  }
}

function toggleFab() {
  if (isExpanded) {
    closeFab();
  } else {
    openFab();
  }
}

function openFab() {
  isExpanded = true;
  fabElement.classList.add('expanded');
  selectedExercise = null;
  lastSetData = null;

  // Check if there's only one exercise - go directly to quick add
  const allExercises = routineData.flatMap(r => r.exercises);
  if (allExercises.length === 1) {
    selectExercise(allExercises[0]);
    return;
  }

  showTreeView();
}

function closeFab() {
  isExpanded = false;
  fabElement.classList.remove('expanded');

  if (panelElement) {
    panelElement.remove();
    panelElement = null;
  }
  if (backdropElement) {
    backdropElement.remove();
    backdropElement = null;
  }
}

function showTreeView() {
  // Create backdrop
  backdropElement = document.createElement('div');
  backdropElement.className = 'fab-backdrop';
  backdropElement.addEventListener('click', closeFab);
  document.body.appendChild(backdropElement);

  // Create panel
  panelElement = document.createElement('div');
  panelElement.className = 'fab-panel';

  const header = document.createElement('div');
  header.className = 'fab-panel-header';
  header.textContent = 'Log a set';

  const tree = document.createElement('div');
  tree.className = 'fab-tree';

  if (routineData.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>No routines yet.</p><p class="text-sm">Create one on the Workout page.</p>';
    tree.appendChild(empty);
  } else {
    for (const routine of routineData) {
      const routineEl = createRoutineTreeItem(routine);
      tree.appendChild(routineEl);
    }

    // Auto-expand first routine if only one
    if (routineData.length === 1) {
      tree.querySelector('.fab-routine')?.classList.add('expanded');
    }
  }

  panelElement.appendChild(header);
  panelElement.appendChild(tree);
  document.body.appendChild(panelElement);
}

function createRoutineTreeItem(routine) {
  const container = document.createElement('div');
  container.className = 'fab-routine';

  const header = document.createElement('div');
  header.className = 'fab-routine-header';
  header.innerHTML = `
    <span>${routine.name}</span>
    <span class="fab-routine-chevron">${icons.chevronRight}</span>
  `;
  header.addEventListener('click', () => {
    container.classList.toggle('expanded');
  });

  const exercises = document.createElement('div');
  exercises.className = 'fab-exercises';

  if (routine.exercises.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'fab-exercise text-muted';
    empty.textContent = 'No exercises';
    exercises.appendChild(empty);
  } else {
    for (const exercise of routine.exercises) {
      const exerciseEl = document.createElement('div');
      exerciseEl.className = 'fab-exercise';
      exerciseEl.innerHTML = `
        <span class="fab-exercise-name">${getExerciseName(exercise)}</span>
        <span class="fab-exercise-muscle">${getMuscleGroup(exercise)}</span>
      `;
      exerciseEl.addEventListener('click', () => selectExercise(exercise));
      exercises.appendChild(exerciseEl);
    }
  }

  container.appendChild(header);
  container.appendChild(exercises);

  return container;
}

async function selectExercise(exercise) {
  selectedExercise = exercise;

  // Fetch last set data for auto-prefill
  try {
    lastSetData = await sets.last(exercise.id);
  } catch (error) {
    console.error('Failed to get last set:', error);
    lastSetData = { reps: null };
  }

  showQuickAdd();
}

function showQuickAdd() {
  // Remove tree view if exists
  if (panelElement) {
    panelElement.remove();
  }
  if (backdropElement) {
    backdropElement.remove();
  }

  // Create backdrop
  backdropElement = document.createElement('div');
  backdropElement.className = 'fab-backdrop';
  backdropElement.addEventListener('click', closeFab);
  document.body.appendChild(backdropElement);

  // Create quick add panel
  panelElement = document.createElement('div');
  panelElement.className = 'fab-panel';

  const quickAdd = document.createElement('div');
  quickAdd.className = 'quick-add';

  const exerciseName = getExerciseName(selectedExercise);
  const lastReps = lastSetData?.reps;

  quickAdd.innerHTML = `
    <div class="quick-add-title">Log set</div>
    <div class="quick-add-exercise">${exerciseName}</div>
    ${lastReps ? `<div class="quick-add-last">Last: ${lastReps} reps</div>` : ''}
    <div class="quick-add-buttons">
      ${[1, 5, 10, 15, 20].map(n =>
    `<button class="quick-add-btn" data-reps="${n}">+${n}</button>`
  ).join('')}
      ${lastReps ? `<button class="quick-add-btn" data-reps="${lastReps}">=${lastReps}</button>` : ''}
    </div>
    <div class="quick-add-custom">
      <input type="number" class="quick-add-input" placeholder="Custom reps" min="0">
      <button class="btn btn-primary btn-sm quick-add-submit">Add</button>
    </div>
  `;

  // Add event listeners
  quickAdd.querySelectorAll('.quick-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reps = parseInt(btn.dataset.reps);
      logSet(reps);
    });
  });

  const input = quickAdd.querySelector('.quick-add-input');
  const submitBtn = quickAdd.querySelector('.quick-add-submit');

  submitBtn.addEventListener('click', () => {
    const reps = parseInt(input.value);
    if (reps >= 0) {
      logSet(reps);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const reps = parseInt(input.value);
      if (reps >= 0) {
        logSet(reps);
      }
    }
  });

  panelElement.appendChild(quickAdd);
  document.body.appendChild(panelElement);

  // Focus input
  input.focus();
}

async function logSet(reps) {
  try {
    await sets.create({
      exerciseId: selectedExercise.id,
      reps
    });

    toast(`Logged ${reps} reps`, 'success');
    closeFab();

    // Dispatch event for other components to refresh
    window.dispatchEvent(new CustomEvent('setLogged', {
      detail: { exerciseId: selectedExercise.id, reps }
    }));
  } catch (error) {
    console.error('Failed to log set:', error);
    toast('Failed to log set', 'error');
  }
}

export async function refreshFab() {
  try {
    routineData = await routines.list();
  } catch (error) {
    console.error('Failed to refresh routines:', error);
  }
}

export default { initFab, refreshFab };
