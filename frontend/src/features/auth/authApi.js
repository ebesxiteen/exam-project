import { request } from "../../shared/api/httpClient.js";

export const authApi = {
  login: (username, password) => request("/api/auth/login", { method: "POST", form: { username, password }, auth: false }),
  register: (username, password, full_name) =>
    request("/api/auth/register", { method: "POST", json: { username, password, full_name }, auth: false }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  changePassword: (current_password, new_password) =>
    request("/api/auth/me/password", { method: "PUT", json: { current_password, new_password } }),
};
