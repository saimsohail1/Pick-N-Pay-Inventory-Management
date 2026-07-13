const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/** Session-only auth storage — cleared when the app/tab is closed. */
export const authStorage = {
  getToken: () => sessionStorage.getItem(TOKEN_KEY),
  getUser: () => sessionStorage.getItem(USER_KEY),
  setToken: (token) => sessionStorage.setItem(TOKEN_KEY, token),
  setUser: (userJson) => sessionStorage.setItem(USER_KEY, userJson),
  clear: () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  clearLegacy: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
