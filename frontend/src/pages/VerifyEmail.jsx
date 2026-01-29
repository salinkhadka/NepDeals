import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import './Auth.css'
const VerifyEmail = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying')
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      verifyEmail()
    } else {
      setStatus('error')
    }
  }, [token])

  const verifyEmail = async () => {
    try {
      const { data } = await axios.get(`/api/auth/verify-email?token=${token}`)
      if (data.success) {
        setStatus('success')
        toast.success('Email verified successfully!')
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      }
    } catch (error) {
      setStatus('error')
      toast.error(error.response?.data?.message || 'Email verification failed')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          {status === 'verifying' && (
            <>
              <h1 className="auth-title">Verifying Email</h1>
              <p className="auth-subtitle">Please wait...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <h1 className="auth-title">Email Verified!</h1>
              <p className="auth-subtitle">Your email has been successfully verified.</p>
              <p>Redirecting to login...</p>
            </>
          )}
          {status === 'error' && (
            <>
              <h1 className="auth-title">Verification Failed</h1>
              <p className="auth-subtitle">Invalid or expired verification link.</p>
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail



