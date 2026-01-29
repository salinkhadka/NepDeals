import { createContext, useState, useContext, useEffect } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const { data } = await api.get('/auth/me')
      if (data.success) {
        setUser(data.data.user || data.data)
      }
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password, totpCode = null, recaptchaToken = null) => {
    try {
      const { data } = await api.post('/auth/login', { 
        email, 
        password, 
        totpCode, 
        recaptchaToken 
      })

      if (data.requires2FA) {
        return { success: false, requires2FA: true }
      }

      if (data.success) {
        setUser(data.data.user || data.data)
        toast.success('Login successful!')
        return { success: true }
      }
    } catch (error) {
      const errorData = error.response?.data
      
      if (errorData?.requiresRecaptcha) {
        return { success: false, requiresRecaptcha: true }
      }

      toast.error(errorData?.message || 'Login failed')
      return { success: false, error: errorData }
    }
  }

  const register = async (userData) => {
    try {
      await api.post('/auth/register', userData)
      toast.success('Registration successful! Please check your email to verify account.', {
        autoClose: 8000
      })
      return { success: true }
    } catch (error) {
      const errorData = error.response?.data
      toast.error(errorData?.message || 'Registration failed')
      return { success: false, errors: errorData?.errors }
    }
  }

  // const logout = async () => {
  //   try {
  //     await api.post('/auth/logout')
  //   } catch (error) {
  //     console.error('Logout error', error)
  //   } finally {
  //     setUser(null)
  //     toast.info('Logged out')
  //     window.location.href = '/login'
  //   }
  // }






  const logout = async () => {
  try {
    await api.post('/auth/logout')
  } catch (error) {
    console.error('Logout error', error)
  } finally {
    // ✅ Clear user state
    setUser(null)
    
    // ✅ Clear all cookies manually (belt-and-suspenders approach)
    document.cookie.split(";").forEach(c => {
      document.cookie = c.trim().split("=")[0] + 
        '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;secure;samesite=strict';
    });
    
    // ✅ Clear storage
    localStorage.clear();
    sessionStorage.clear();
    
    toast.info('Logged out successfully')
    
    // ✅ Hard redirect to clear everything
    window.location.href = '/login'
  }
}







  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      isAuthenticated: !!user,
      checkAuthStatus
    }}>
      {loading ? (
        <div style={{
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '1.2rem',
          color: '#D4AF37'
        }}>
          Loading...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}