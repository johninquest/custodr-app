import axios from 'axios'
import { auth } from './firebase'
import type {
  AuditEntry,
  ConsentRecord,
  Contract,
  ContractShare,
  Pagination,
  User,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser
    if (user) {
      try {
        const token = await user.getIdToken()
        config.headers.Authorization = `Bearer ${token}`
      } catch (error) {
        console.error('Error getting ID token:', error)
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Sign out and redirect to login
      auth.signOut().then(() => {
        window.location.href = '/auth'
      })
    }
    return Promise.reject(error)
  }
)

export default api

// ---------------------------------------------------------------------------
// Typed API helpers
// ---------------------------------------------------------------------------

interface ListResponse<T> {
  data: T[]
  pagination: Pagination
}

export const contractsApi = {
  list: async (params?: { status?: string; category?: string; page?: number; limit?: number }) => {
    const { data } = await api.get<ListResponse<Contract>>('/contracts', { params })
    return data
  },
  get: async (id: string) => {
    const { data } = await api.get<Contract>(`/contracts/${id}`)
    return data
  },
  create: async (input: Partial<Contract>) => {
    const { data } = await api.post<Contract>('/contracts', input)
    return data
  },
  update: async (id: string, input: Partial<Contract>) => {
    const { data } = await api.put<Contract>(`/contracts/${id}`, input)
    return data
  },
  remove: async (id: string) => {
    await api.delete(`/contracts/${id}`)
  },
  listShares: async (id: string) => {
    const { data } = await api.get<{ data: ContractShare[] }>(`/contracts/${id}/shares`)
    return data.data
  },
  createShare: async (id: string, granteeEmail: string) => {
    const { data } = await api.post<ContractShare>(`/contracts/${id}/shares`, { grantee_email: granteeEmail })
    return data
  },
  revokeShare: async (id: string, shareId: string) => {
    await api.delete(`/contracts/${id}/shares/${shareId}`)
  },
  listAudit: async (id: string, params?: { page?: number; limit?: number }) => {
    const { data } = await api.get<ListResponse<AuditEntry>>(`/contracts/${id}/audit`, { params })
    return data
  },
}

export const consentsApi = {
  list: async () => {
    const { data } = await api.get<{ data: ConsentRecord[] }>('/users/me/consents')
    return data.data
  },
  grant: async (consentType: string, version: string) => {
    const { data } = await api.post<ConsentRecord>('/users/me/consents', {
      consent_type: consentType,
      version,
    })
    return data
  },
  withdraw: async (consentType: string) => {
    await api.delete(`/users/me/consents/${consentType}`)
  },
}

export const usersApi = {
  me: async () => {
    const { data } = await api.get<User>('/users/me')
    return data
  },
}
