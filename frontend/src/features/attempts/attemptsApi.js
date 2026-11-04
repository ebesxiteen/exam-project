import { request } from "../../shared/api/httpClient.js";

export const attemptsApi = {
  list: () => request("/api/v1/attempts"),
  start: (examId) => request(`/api/v1/exams/${examId}/attempts`, { method: "POST" }),
  saveAnswers: (attemptId, answers) =>
    request(`/api/v1/attempts/${attemptId}/answers`, { method: "PUT", json: { answers } }),
  submit: (attemptId) => request(`/api/v1/attempts/${attemptId}/submit`, { method: "POST" }),
  result: (attemptId) => request(`/api/v1/attempts/${attemptId}/result`),
  reportViolation: (attemptId, type) =>
    request(`/api/v1/attempts/${attemptId}/violations`, { method: "POST", json: { type } }),
};
