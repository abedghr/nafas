import Axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const TOKEN_KEY = "nafas_admin_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export const LANG_KEY = "nafas_admin_lang";
export const getLang = () => localStorage.getItem(LANG_KEY) || "en";
export const setLang = (l: string) => localStorage.setItem(LANG_KEY, l);

// All admin calls go through /api/admin.
const axios = Axios.create({ baseURL: `${BASE_URL}/api/admin` });

axios.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["x-lang"] = getLang();
  return config;
});

axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      setToken(null);
      if (location.pathname !== "/login") location.assign("/login");
    }
    return Promise.reject(err);
  },
);

export default axios;
