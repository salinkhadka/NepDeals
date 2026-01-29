// import axios from 'axios'

// // Create Axios instance
// const api = axios.create({
//   baseURL: '/api',
//   headers: {
//     'Content-Type': 'application/json'
//   },
//   withCredentials: true // CRITICAL: Sends cookies with every request
// })

// // Helper to extract token from cookies
// const getCookie = (name) => {
//   const value = `; ${document.cookie}`
//   const parts = value.split(`; ${name}=`)
//   if (parts.length === 2) return parts.pop().split(';').shift()
//   return null
// }

// // Request Interceptor
// api.interceptors.request.use(
//   (config) => {
//     // 1. Add CSRF token from cookie
//     const csrfToken = getCookie('csrf-token')
//     if (csrfToken) {
//       config.headers['X-CSRF-Token'] = csrfToken
//     }

//     // 2. Add JWT token from cookie to Authorization header
//     const token = getCookie('token')
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`
//     }
    
//     return config
//   },
//   (error) => Promise.reject(error)
// )

// // Response Interceptor
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     // Handle 401 errors
//     if (error.response?.status === 401) {
//       const currentPath = window.location.pathname
//       // Only redirect if not already on login page
//       if (!currentPath.includes('/login')) {
//         window.location.href = '/login'
//       }
//     }
//     return Promise.reject(error)
//   }
// )

// export default api











































// client/src/services/api.js - COMPLETE FIX
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

// Helper to extract token from cookies
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

// Request Interceptor - ENHANCED
api.interceptors.request.use(
  (config) => {
    // 1. Add CSRF token
    const csrfToken = getCookie('csrf-token')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }

    // 2. Add JWT token
    const token = getCookie('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    // ✅ NEW: Add request timestamp (prevent replay attacks)
    config.headers['X-Timestamp'] = Date.now().toString()
    
    // ✅ NEW: Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID()
    
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor - ENHANCED
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const code = error.response?.data?.code
    
    // ✅ Handle specific error codes
    if (status === 401) {
      if (code === 'TOKEN_EXPIRED') {
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?return=${returnUrl}`
      } else if (code === 'TOKEN_REVOKED' || code === 'IP_MISMATCH') {
        // Force logout on security events
        localStorage.removeItem('user')
        window.location.href = '/login?reason=security'
      }
    }
    
    if (status === 403 && code === 'CSRF_TOKEN_MISSING') {
      // Refresh page to get new CSRF token
      window.location.reload()
    }
    
    return Promise.reject(error)
  }
)

export default api