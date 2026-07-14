import apiClient from "./client.js";

export const authAPI = {
  register:       (payload)    => apiClient.post("/auth/register",         payload).then((r) => r.data),
  login:          (payload)    => apiClient.post("/auth/login",            payload).then((r) => r.data),
  googleAuth:     (credential) => apiClient.post("/auth/google",           { credential }).then((r) => r.data),
  logout:         ()           => apiClient.post("/auth/logout").then((r) => r.data),
  refresh:        ()           => apiClient.post("/auth/refresh").then((r) => r.data),
  getMe:          ()           => apiClient.get("/auth/me").then((r) => r.data),
  updateProfile:  (payload)    => apiClient.patch("/auth/me",              payload).then((r) => r.data),
  changePassword: (payload)    => apiClient.patch("/auth/change-password", payload).then((r) => r.data),
};

export const quizAPI = {
  generate:      (payload)           => apiClient.post("/quiz/generate",             payload).then((r) => r.data),
  submitAttempt: (quizId, payload)   => apiClient.post(`/quiz/${quizId}/attempt`,    payload).then((r) => r.data),
  list:          ()                  => apiClient.get("/quiz").then((r) => r.data),
  getById:       (quizId)            => apiClient.get(`/quiz/${quizId}`).then((r) => r.data),
};

export const flashcardAPI = {
  generate:     (payload)         => apiClient.post("/flashcards/generate",             payload).then((r) => r.data),
  review:       (cardId, rating)  => apiClient.post(`/flashcards/${cardId}/review`,     { rating }).then((r) => r.data),
  getDue:       (deckId)          => apiClient.get("/flashcards/due",                   { params: deckId ? { deckId } : {} }).then((r) => r.data),
  listDecks:    ()                => apiClient.get("/flashcards/decks").then((r) => r.data),
  getDeckCards: (deckId)          => apiClient.get(`/flashcards/decks/${deckId}/cards`).then((r) => r.data),
};

export const analyticsAPI = {
  getProgress: (days = 30, subject = "all") =>
    apiClient.get("/analytics/progress", { params: { days, subject } }).then((r) => r.data),
  getSummary:  () => apiClient.get("/analytics/summary").then((r) => r.data),
  getHeatmap:  () => apiClient.get("/analytics/heatmap").then((r) => r.data),
};

export const documentAPI = {
  upload: (formData) =>
    apiClient.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),

  list:   ()      => apiClient.get("/documents").then((r) => r.data),
  delete: (docId) => apiClient.delete(`/documents/${docId}`).then((r) => r.data),
};

export const notebookAPI = {
  getConversation:    (docId)           => apiClient.get(`/notebook/${docId}`).then((r) => r.data),
  chat:               (docId, message)  => apiClient.post(`/notebook/${docId}/chat`, { message }).then((r) => r.data),
  clearConversation:  (convId)          => apiClient.delete(`/notebook/${convId}/clear`).then((r) => r.data),
};
