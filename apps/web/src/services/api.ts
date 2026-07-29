import axios from 'axios'
import { auth } from './firebase'

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
