import axios from "axios"

const api = axios.create({
  baseURL: "/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("kitchen_token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname
      if (currentPath !== "/login") {
        localStorage.removeItem("kitchen_token")
        localStorage.removeItem("kitchen_user")
      }
    }
    return Promise.reject(error)
  }
)

// ==================== SERVICE HELPERS ====================

export const menuService = {
  getAll: (params) => api.get("/menu", { params }),
  getById: (id) => api.get(`/menu/${id}`),
  create: (data) => api.post("/menu", data),
  update: (id, data) => api.put(`/menu/${id}`, data),
  delete: (id) => api.delete(`/menu/${id}`),
}

export const recipeService = {
  getByDish: (dishId) => api.get(`/recipes/${dishId}`),
  getAll: (params) => api.get("/recipes", { params }),
  addIngredient: (data) => api.post("/recipes", data),
  updateIngredient: (recipeId, data) => api.put(`/recipes/${recipeId}`, data),
  removeIngredient: (recipeId) => api.delete(`/recipes/${recipeId}`),
}

export const salesService = {
  getAll: (params) => api.get("/sales", { params }),
  getById: (id) => api.get(`/sales/${id}`),
  create: (data) => api.post("/sales", data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  uploadCsv: (formData) =>
    api.post("/sales/upload-csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
}

export const inventoryService = {
  getIngredients: (params) => api.get("/inventory/ingredients", { params }),
  getIngredient: (id) => api.get(`/inventory/ingredients/${id}`),
  createIngredient: (data) => api.post("/inventory/ingredients", data),
  updateIngredient: (id, data) => api.put(`/inventory/ingredients/${id}`, data),
  getBatches: (params) => api.get("/inventory/batches", { params }),
  receiveBatch: (data) => api.post("/inventory/batches", data),
  adjustStock: (data) => api.post("/inventory/adjust", data),
  consumeStock: (data) => api.post("/inventory/consume", data),
  getMovements: (params) => api.get("/inventory/movements", { params }),
  getDashboard: () => api.get("/inventory/dashboard"),
}

export const purchaseService = {
  getRecommendations: (params) => api.get("/purchases/recommendations", { params }),
  getRequirements: (params) => api.get("/purchases/requirements", { params }),
  getAll: (params) => api.get("/purchases", { params }),
  getById: (id) => api.get(`/purchases/${id}`),
  create: (data) => api.post("/purchases", data),
  update: (id, data) => api.put(`/purchases/${id}`, data),
  receive: (id) => api.post(`/purchases/${id}/receive`),
}

export const forecastService = {
  getForecasts: (params) => api.get("/forecasts", { params }),
  retrainModel: () => api.post("/forecasts/train"),
  getEvaluation: () => api.get("/forecasts/evaluation"),
  getCalendar: (params) => api.get("/forecasts/calendar", { params }),
  getHistory: (params) => api.get("/forecasts/history", { params }),
}

export default api
