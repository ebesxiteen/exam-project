import { request } from "../../shared/api/httpClient.js";

export const examsApi = {
  list: () => request("/api/v1/exams"),
  publish: (examId) => request(`/api/v1/exams/${examId}/publish`, { method: "POST" }),
};
