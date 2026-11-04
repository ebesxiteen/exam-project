import { request } from "../../shared/api/httpClient.js";

export const resultsApi = {
  list: (examId) => request(`/api/v1/exams/${examId}/results`),
  downloadCsv: (examId) => request(`/api/v1/exams/${examId}/results.csv`, { blob: true }),
};
