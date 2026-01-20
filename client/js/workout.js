import '../css/base.css';
import '../css/components.css';
import { requireAuth } from './lib/auth.js';
import { routines, exercises } from './lib/api.js';
import { toast, icons, getExerciseName, getMuscleGroup, confirm, getExerciseIcon } from './lib/utils.js';
import { initNav } from './components/nav.js';
import { initFab, refreshFab } from './components/fab.js';

let routineData = [];
let predefinedExercises = [];
let editingRoutineId = null;
let selectedRoutineId = null;

async function init() {
  const authenticated = await requireAuth();
  if (!authenticated) return;

  initNav();

  await loadRoutines();
  await initFab(routineData);
  await loadPredefinedExercises();

  setupEventListeners();
}

async function loadRoutines() {
  const container = document.getElementById('routines-container');

  try {
    routineData = await routines.list();
    renderRoutines();
  } catch (error) {
    console.error('Failed to load routines:', error);
    container.innerHTML = '<div class="empty-state">Failed to load routines</div>';
  }
}

async function loadPredefinedExercises() {
  try {
    predefinedExercises = await exercises.predefined();
    renderMuscleGroups();
  } catch (error) {
    console.error('Failed to load predefined exercises:', error);
  }
}

function renderRoutines() {
  const container = document.getElementById('routines-container');

  // Save expanded state before re-rendering
  const expandedIds = new Set(
    [...container.querySelectorAll('.routine-card.expanded')].map(el => el.dataset.id)
  );

  if (routineData.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No routines yet.</p>
        <p class="text-sm text-muted">Create your first routine to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = routineData.map(routine => `
    <div class="routine-card" data-id="${routine.id}">
      <div class="routine-header">
        <div>
          <div class="routine-name">${routine.name}</div>
          <div class="routine-meta">${routine.exercises.length} exercise${routine.exercises.length !== 1 ? 's' : ''}</div>
        </div>
        <span class="routine-chevron">${icons.chevronDown}</span>
      </div>
      <div class="routine-body">
        <div class="exercises-list">
          ${routine.exercises.length === 0
      ? '<div class="empty-state">No exercises yet</div>'
      : routine.exercises.map(ex => `
              <div class="exercise-item" data-id="${ex.id}">
                <div class="exercise-info">
                  <span class="exercise-icon">${getExerciseIcon(getExerciseName(ex))}</span>
                  <div>
                    <div class="exercise-name">${getExerciseName(ex)}</div>
                    <div class="exercise-muscle">${getMuscleGroup(ex)}</div>
                  </div>
                </div>
                <div class="exercise-actions">
                  <button class="btn btn-ghost-danger btn-sm delete-exercise" data-id="${ex.id}">
                    ${icons.trash}
                  </button>
                </div>
              </div>
            `).join('')
    }
        </div>
        <div class="routine-actions">
          <button class="btn btn-secondary btn-sm add-exercise-btn" data-routine-id="${routine.id}">+ Exercise</button>
          <button class="btn btn-ghost btn-sm edit-routine-btn" data-id="${routine.id}">${icons.edit}</button>
          <button class="btn btn-ghost-danger btn-sm delete-routine-btn" data-id="${routine.id}">${icons.trash}</button>
        </div>
      </div>
    </div>
  `).join('');

  // Restore expanded state
  expandedIds.forEach(id => {
    const card = container.querySelector(`.routine-card[data-id="${id}"]`);
    if (card) card.classList.add('expanded');
  });

  // Add expand/collapse listeners
  container.querySelectorAll('.routine-header').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.routine-card').classList.toggle('expanded');
    });
  });

  // Add exercise button listeners
  container.querySelectorAll('.add-exercise-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectedRoutineId = btn.dataset.routineId;
      openExerciseModal();
    });
  });

  // Edit routine listeners
  container.querySelectorAll('.edit-routine-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const routine = routineData.find(r => r.id === btn.dataset.id);
      openRoutineModal(routine);
    });
  });

  // Delete routine listeners
  container.querySelectorAll('.delete-routine-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteRoutine(btn.dataset.id);
    });
  });

  // Delete exercise listeners
  container.querySelectorAll('.delete-exercise').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteExercise(btn.dataset.id);
    });
  });
}

function renderMuscleGroups() {
  const container = document.getElementById('muscle-groups-list');
  if (!container) return;

  container.innerHTML = predefinedExercises.map(group => `
    <div class="routine-card">
      <div class="routine-header" data-expand>
        <span>${group.name}</span>
        <span class="routine-chevron">${icons.chevronDown}</span>
      </div>
      <div class="routine-body">
        ${group.predefinedExercises.map(ex => `
          <div class="exercise-item predefined-exercise" data-id="${ex.id}">
            <span class="exercise-icon">${getExerciseIcon(ex.name)}</span>
            <span class="exercise-name">${ex.name}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // Add expand listeners
  container.querySelectorAll('[data-expand]').forEach(header => {
    header.addEventListener('click', () => {
      header.closest('.routine-card').classList.toggle('expanded');
    });
  });

  // Add select listeners
  container.querySelectorAll('.predefined-exercise').forEach(item => {
    item.addEventListener('click', () => {
      addPredefinedExercise(item.dataset.id);
    });
  });
}

function setupEventListeners() {
  // Add routine button
  document.getElementById('add-routine-btn').addEventListener('click', () => {
    openRoutineModal();
  });

  // Routine modal
  document.getElementById('close-routine-modal').addEventListener('click', closeRoutineModal);
  document.getElementById('routine-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeRoutineModal();
  });

  // Routine form
  document.getElementById('routine-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('routine-name').value.trim();
    if (!name) return;

    try {
      if (editingRoutineId) {
        await routines.update(editingRoutineId, { name });
        toast('Routine updated', 'success');
      } else {
        await routines.create({ name });
        toast('Routine created', 'success');
      }

      closeRoutineModal();
      await loadRoutines();
      await refreshFab();
    } catch (error) {
      console.error('Failed to save routine:', error);
      toast(error.message || 'Failed to save routine', 'error');
    }
  });

  // Exercise modal
  document.getElementById('close-exercise-modal').addEventListener('click', closeExerciseModal);
  document.getElementById('exercise-modal').addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) closeExerciseModal();
  });

  // Tab switching
  document.querySelectorAll('#exercise-modal .stats-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('#exercise-modal .stats-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const tabId = tab.dataset.tab;
      document.getElementById('predefined-tab').classList.toggle('hidden', tabId !== 'predefined');
      document.getElementById('custom-tab').classList.toggle('hidden', tabId !== 'custom');
    });
  });

  // Custom exercise form
  document.getElementById('custom-exercise-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('custom-exercise-name').value.trim();
    if (!name) return;

    try {
      await exercises.create({
        routineId: selectedRoutineId,
        customName: name
      });

      toast('Exercise added', 'success');
      closeExerciseModal();
      await loadRoutines();
      await refreshFab();
    } catch (error) {
      console.error('Failed to add exercise:', error);
      toast(error.message || 'Failed to add exercise', 'error');
    }
  });
}

function openRoutineModal(routine = null) {
  editingRoutineId = routine?.id || null;
  document.getElementById('routine-modal-title').textContent = routine ? 'Edit Routine' : 'Add Routine';
  document.getElementById('routine-name').value = routine?.name || '';
  document.getElementById('routine-modal').classList.remove('hidden');
  document.getElementById('routine-name').focus();
}

function closeRoutineModal() {
  document.getElementById('routine-modal').classList.add('hidden');
  editingRoutineId = null;
}

function openExerciseModal() {
  document.getElementById('exercise-modal').classList.remove('hidden');
  document.getElementById('custom-exercise-name').value = '';

  // Reset to predefined tab
  document.querySelectorAll('#exercise-modal .stats-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('#exercise-modal .stats-tab[data-tab="predefined"]').classList.add('active');
  document.getElementById('predefined-tab').classList.remove('hidden');
  document.getElementById('custom-tab').classList.add('hidden');
}

function closeExerciseModal() {
  document.getElementById('exercise-modal').classList.add('hidden');
  selectedRoutineId = null;
}

async function addPredefinedExercise(predefinedId) {
  try {
    await exercises.create({
      routineId: selectedRoutineId,
      predefinedExerciseId: predefinedId
    });

    toast('Exercise added', 'success');
    closeExerciseModal();
    await loadRoutines();
    await refreshFab();
  } catch (error) {
    console.error('Failed to add exercise:', error);
    toast(error.message || 'Failed to add exercise', 'error');
  }
}

async function deleteRoutine(id) {
  if (!await confirm('Delete this routine and all its exercises?')) return;

  try {
    await routines.delete(id);
    toast('Routine deleted', 'success');
    await loadRoutines();
    await refreshFab();
  } catch (error) {
    console.error('Failed to delete routine:', error);
    toast('Failed to delete routine', 'error');
  }
}

async function deleteExercise(id) {
  if (!await confirm('Delete this exercise and all its logged sets?')) return;

  try {
    await exercises.delete(id);
    toast('Exercise deleted', 'success');
    await loadRoutines();
    await refreshFab();
  } catch (error) {
    console.error('Failed to delete exercise:', error);
    toast('Failed to delete exercise', 'error');
  }
}

// Initialize
init();
