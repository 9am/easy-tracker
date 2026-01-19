import { auth } from './api.js';

let currentUser = null;
let authChecked = false;

export async function checkAuth() {
  if (authChecked) return currentUser;

  try {
    currentUser = await auth.me();
    authChecked = true;
    return currentUser;
  } catch (error) {
    if (error.status === 401) {
      currentUser = null;
      authChecked = true;
      return null;
    }
    throw error;
  }
}

export function getUser() {
  return currentUser;
}

export function isAuthenticated() {
  return currentUser !== null;
}

export async function login() {
  auth.login();
}

export async function devLogin() {
  await auth.devLogin();
  authChecked = false;
  return checkAuth();
}

export async function logout() {
  await auth.logout();
  currentUser = null;
  authChecked = false;
  window.location.href = '/index.html';
}

export async function requireAuth() {
  const user = await checkAuth();
  if (!user) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

export default { checkAuth, getUser, isAuthenticated, login, devLogin, logout, requireAuth };
