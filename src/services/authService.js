import API from "./api";

export const loginUser = (email, password) =>
  API.post("/auth/login", { email, password });

export const registerUser = (name, email, password) =>
  API.post("/auth/register", { name, email, password });

export const logoutUser = () =>
  API.post("/auth/logout");