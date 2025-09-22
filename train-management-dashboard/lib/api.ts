import axios, { type AxiosInstance, type AxiosResponse } from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
}

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        "Content-Type": "application/json",
      },
    })

    this.client.interceptors.request.use((config) => {
      const token = typeof window !== "undefined" ? localStorage.getItem("train_auth_token") : null
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or missing: clear token and let caller handle fallback/mock
          if (typeof window !== "undefined") {
            localStorage.removeItem("train_auth_token")
          }
        }
        return Promise.reject(error)
      },
    )
  }

  private async request<T>(endpoint: string, options: any = {}): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.client.request({
        url: endpoint,
        ...options,
      })

      return { data: response.data }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "An error occurred"
      return { error: errorMessage }
    }
  }

  // Auth endpoints - /api/auth/*
  async login(username: string, password: string) {
    return this.request("/api/auth/login", {
      method: "POST",
      data: { username, password },
    })
  }

  async register(username: string, password: string, role?: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      data: { username, password, role },
    })
  }

  async getProfile() {
    return this.request("/api/auth/profile")
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      data: { currentPassword, newPassword },
    })
  }

  async logout() {
    return this.request("/api/auth/logout", { method: "POST" })
  }

  // Train endpoints - /api/trains/*
  async getTrains(params?: {
    status?: string
    location?: string
    sortBy?: string
    order?: string
    page?: number
    limit?: number
  }) {
    return this.request("/api/trains", {
      method: "GET",
      params,
    })
  }

  async getTrainConstraints() {
    return this.request("/api/trains/constraints")
  }

  async getTrainDetails(trainId: string) {
    return this.request(`/api/trains/${trainId}`)
  }

  async addTrain(trainData: any) {
    return this.request("/api/trains", {
      method: "POST",
      data: trainData,
    })
  }

  async updateTrain(trainId: string, trainData: any) {
    return this.request(`/api/trains/${trainId}`, {
      method: "PUT",
      data: trainData,
    })
  }

  async deleteTrain(trainId: string) {
    return this.request(`/api/trains/${trainId}`, {
      method: "DELETE",
    })
  }

  // Induction endpoints - /api/induction/*
  async getLatestInductionPlan() {
    return this.request("/api/induction/latest")
  }

  async getInductionHistory(params?: { limit?: number; page?: number }) {
    return this.request("/api/induction/history", {
      method: "GET",
      params,
    })
  }

  async getInductionExplanation(planId: string) {
    return this.request(`/api/induction/explain/${planId}`)
  }

  async generateInductionPlan(data?: {
    planDate?: string
    forceRegenerate?: boolean
    constraints?: any
  }) {
    return this.request("/api/induction/generate", {
      method: "POST",
      data,
    })
  }

  async simulateInduction(data: {
    trainId: string
    modifications: any
    baseDate?: string
    constraints?: any
  }) {
    return this.request("/api/induction/simulate", {
      method: "POST",
      data,
    })
  }

  // Schedule an induction session - not implemented on backend yet; placeholder endpoint
  async scheduleInduction(inductionData: any) {
    return this.request("/api/induction/schedule", {
      method: "POST",
      data: inductionData,
    })
  }

  // Demo endpoints - /api/demo/*
  async generateSampleData(params?: { trainCount?: number; includePlans?: boolean }) {
    return this.request("/api/demo/sample-data", {
      method: "GET",
      params,
    })
  }

  async resetDemoData(confirmReset = true) {
    return this.request("/api/demo/reset", {
      method: "POST",
      data: { confirmReset },
    })
  }

  async getDemoScenarios() {
    return this.request("/api/demo/scenarios")
  }

  async applyDemoScenario(scenarioId: string) {
    return this.request(`/api/demo/apply-scenario/${scenarioId}`, {
      method: "POST",
    })
  }

  // Data endpoints - /api/data/*
  async uploadDataFile(formData: FormData) {
    return this.request("/api/data/upload", {
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  }

  async validateDataFile(formData: FormData) {
    return this.request("/api/data/validate", {
      method: "POST",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })
  }

  async downloadTemplate(type: string) {
    return this.client.get(`/api/data/template/${type}`, {
      responseType: "blob",
    })
  }

  async getData() {
    return this.getTrains()
  }

  async getInductions() {
    return this.getLatestInductionPlan()
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
