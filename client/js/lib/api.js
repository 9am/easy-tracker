// API Client
const API_BASE = '/api';

// Loading overlay management
let loadingOverlay = null;
let activeRequests = 0;

function showLoadingOverlay() {
  activeRequests++;
  if (activeRequests === 1) {
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.className = 'loading-overlay';
      loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    }
    document.body.appendChild(loadingOverlay);
  }
}

function hideLoadingOverlay() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0 && loadingOverlay && loadingOverlay.parentNode) {
    loadingOverlay.remove();
  }
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const method = options.method || 'GET';
  const isMutating = ['POST', 'PUT', 'DELETE'].includes(method.toUpperCase());

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'same-origin'
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  // Show loading overlay for mutating requests
  if (isMutating) {
    showLoadingOverlay();
  }

  try {
    const response = await fetch(url, config);

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Network error', 0, { message: error.message });
  } finally {
    // Hide loading overlay
    if (isMutating) {
      hideLoadingOverlay();
    }
  }
}

// Auth
export const auth = {
  login() {
    window.location.href = '/api/auth?action=google';
  },

  async devLogin() {
    return request('/auth?action=dev', { method: 'POST' });
  },

  async logout() {
    return request('/auth?action=logout', { method: 'POST' });
  },

  async me() {
    return request('/user/me');
  }
};

// Routines
export const routines = {
  async list() {
    return request('/routines');
  },

  async get(id) {
    return request(`/routines/${id}`);
  },

  async create(data) {
    return request('/routines', { method: 'POST', body: data });
  },

  async update(id, data) {
    return request(`/routines/${id}`, { method: 'PUT', body: data });
  },

  async delete(id) {
    return request(`/routines/${id}`, { method: 'DELETE' });
  }
};

// Exercises
export const exercises = {
  async list(routineId) {
    const params = routineId ? `?routineId=${routineId}` : '';
    return request(`/exercises${params}`);
  },

  async get(id) {
    return request(`/exercises/${id}`);
  },

  async create(data) {
    return request('/exercises', { method: 'POST', body: data });
  },

  async update(id, data) {
    return request(`/exercises/${id}`, { method: 'PUT', body: data });
  },

  async delete(id) {
    return request(`/exercises/${id}`, { method: 'DELETE' });
  },

  async predefined() {
    return request('/exercises/predefined');
  }
};

// Sets
export const sets = {
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.exerciseId) params.set('exerciseId', options.exerciseId);
    if (options.date) params.set('date', options.date);
    if (options.from) params.set('from', options.from);
    if (options.to) params.set('to', options.to);

    const query = params.toString();
    return request(`/sets${query ? `?${query}` : ''}`);
  },

  async get(id) {
    return request(`/sets?id=${id}`);
  },

  async create(data) {
    return request('/sets', { method: 'POST', body: data });
  },

  async update(id, data) {
    return request(`/sets?id=${id}`, { method: 'PUT', body: data });
  },

  async delete(id) {
    return request(`/sets?id=${id}`, { method: 'DELETE' });
  }
};

// Stats
export const stats = {
  async general(date) {
    const params = new URLSearchParams({ type: 'general' });
    if (date) params.set('date', date);
    return request(`/stats?${params.toString()}`);
  },

  async calendar(year, month) {
    const params = new URLSearchParams({ type: 'calendar' });
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    return request(`/stats?${params.toString()}`);
  },

  async trends(options = {}) {
    const params = new URLSearchParams({ type: 'trends' });
    if (options.granularity) params.set('granularity', options.granularity);
    if (options.exerciseIds) params.set('exerciseIds', options.exerciseIds.join(','));
    if (options.routineId) params.set('routineId', options.routineId);
    if (options.days) params.set('days', options.days);
    return request(`/stats?${params.toString()}`);
  }
};

export default { auth, routines, exercises, sets, stats, ApiError };
