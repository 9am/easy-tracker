// API Client
const API_BASE = '/api';

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
  }
}

// Auth
export const auth = {
  login() {
    window.location.href = '/api/auth/google';
  },

  async devLogin() {
    return request('/auth/dev', { method: 'POST' });
  },

  async logout() {
    return request('/auth/logout', { method: 'POST' });
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
    return request(`/sets/${id}`);
  },

  async create(data) {
    return request('/sets', { method: 'POST', body: data });
  },

  async update(id, data) {
    return request(`/sets/${id}`, { method: 'PUT', body: data });
  },

  async delete(id) {
    return request(`/sets/${id}`, { method: 'DELETE' });
  },

  async last(exerciseId) {
    return request(`/sets/last?exerciseId=${exerciseId}`);
  }
};

// Stats
export const stats = {
  async general(date) {
    const params = date ? `?date=${date}` : '';
    return request(`/stats/general${params}`);
  },

  async calendar(year, month) {
    const params = new URLSearchParams();
    if (year) params.set('year', year);
    if (month) params.set('month', month);
    const query = params.toString();
    return request(`/stats/calendar${query ? `?${query}` : ''}`);
  },

  async trends(options = {}) {
    const params = new URLSearchParams();
    if (options.granularity) params.set('granularity', options.granularity);
    if (options.exerciseIds) params.set('exerciseIds', options.exerciseIds.join(','));
    if (options.routineId) params.set('routineId', options.routineId);
    if (options.days) params.set('days', options.days);
    const query = params.toString();
    return request(`/stats/trends${query ? `?${query}` : ''}`);
  }
};

export default { auth, routines, exercises, sets, stats, ApiError };
