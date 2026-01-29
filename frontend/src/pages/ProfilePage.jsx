import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/Auth.jsx'
import api from '../services/api'
import { QRCodeSVG } from 'qrcode.react' // npm install qrcode.react
import { toast } from 'react-toastify'
import './ProfilePage.css'

const ProfilePage = () => {
  const { user, isAuthenticated, checkAuthStatus } = useAuth()
  const navigate = useNavigate()

  // Profile Edit States
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  })

  // Password Change States
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 2FA States
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [totpToken, setTotpToken] = useState('')


  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || ''
      })
    }
  }, [user])

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value })
  }

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    try {
      // Ensure we only send changed fields or valid data
      const updatePayload = {
        name: profileData.name.trim(),
        phone: profileData.phone.trim()
      }

      const { data } = await api.put('/users/profile', updatePayload)
      if (data.success) {
        toast.success('Profile updated successfully!')
        setIsEditing(false)
        await checkAuthStatus()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('New passwords do not match')
    }

    try {
      const { data } = await api.put('/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      if (data.success) {
        toast.success('Password changed successfully!')
        setIsChangingPassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    }
  }

  const handleDisable2FA = async (e) => {
    e.preventDefault()
    try {
      const { data } = await api.post('/users/2fa/disable', { password: disablePassword })
      if (data.success) {
        toast.success('2FA Disabled Successfully')
        setShowDisable2FA(false)
        setDisablePassword('')
        await checkAuthStatus()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid Password')
    }
  }

  const start2FASetup = async () => {
    try {
      const { data } = await api.post('/users/2fa/setup')
      setQrCodeUrl(data.qrCodeUrl)
      setShow2FASetup(true)
    } catch (error) {
      toast.error('Could not initiate 2FA setup')
    }
  }

  const enable2FA = async () => {
    try {
      const { data } = await api.post('/users/2fa/enable', { token: totpToken })
      if (data.success) {

        toast.success('2FA Enabled Successfully!')
        setShow2FASetup(false)
        await checkAuthStatus()
      }
    } catch (error) {
      toast.error('Invalid Code')
    }
  }

  if (!user) return <div className="loading">Loading...</div>

  return (
    <div className="profile-page">
      <div className="container">
        <h1 className="page-title">My Profile</h1>
        <div className="profile-content">

          <div className="profile-layout-grid">
            {/* Main Profile Info */}
            <div className="profile-card profile-main">
              {!isEditing ? (
                <>
                  <div className="profile-header">
                    <div className="profile-avatar">
                      {user.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="profile-text">
                      <h2>{user.name}</h2>
                      <p>{user.email}</p>
                      {user.phone && <p className="phone-text">📞 {user.phone}</p>}
                      <span className={`security-status ${user.twoFactorEnabled ? 'secure' : 'warning'}`}>
                        {user.twoFactorEnabled ? "Shield Active" : "Security at Risk"}
                      </span>
                    </div>
                  </div>

                  <div className="profile-actions">
                    <button className="btn btn-outline btn-block" onClick={() => setIsEditing(true)}>Edit Profile</button>
                    {!isChangingPassword && (
                      <button className="btn btn-outline btn-block" onClick={() => setIsChangingPassword(true)}>Change Password</button>
                    )}
                  </div>
                </>
              ) : (
                <div className="edit-profile-container">
                  <form className="edit-profile-form" onSubmit={handleUpdateProfile}>
                    <h2>Edit Profile</h2>
                    <div className="form-group">
                      <label>Full Name</label>
                      <input
                        type="text"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileChange}
                        required
                        placeholder="Your full name"
                      />
                      <small className="hint">Only letters and spaces (min 2 chars)</small>
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileChange}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="form-actions-flex">
                      <button type="submit" className="btn btn-primary">Save Changes</button>
                      <button type="button" className="btn btn-outline" onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                  </form>

                  {user.twoFactorEnabled && (
                    <div className="edit-security-actions mt-6">
                      <hr className="divider" />
                      <h3 className="section-subtitle">Security Control</h3>
                      {!showDisable2FA ? (
                        <button className="btn btn-outline btn-block text-danger" onClick={() => setShowDisable2FA(true)}>
                          Disable Two-Factor Authentication
                        </button>
                      ) : (
                        <form onSubmit={handleDisable2FA} className="disable-2fa-form-inline">
                          <div className="form-group">
                            <label>Confirm Password to Disable 2FA</label>
                            <input
                              type="password"
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              required
                              placeholder="Enter password"
                            />
                          </div>
                          <div className="form-actions-flex mt-2">
                            <button type="submit" className="btn btn-primary">Confirm</button>
                            <button type="button" className="btn btn-outline" onClick={() => setShowDisable2FA(false)}>Cancel</button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Change Password Section */}
            {isChangingPassword && (
              <div className="profile-card password-card">
                <form onSubmit={handleChangePassword}>
                  <h2>Change Password</h2>
                  <div className="form-group">
                    <label>Current Password</label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                    <small className="hint">At least 12 characters, uppercase, number & symbol</small>
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                    />
                  </div>
                  <div className="form-actions-flex">
                    <button type="submit" className="btn btn-primary">Update Password</button>
                    <button type="button" className="btn btn-outline" onClick={() => setIsChangingPassword(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Section */}
            <div className="profile-card security-card">
              <h2>Security</h2>
              <div className="security-content">
                {user.twoFactorEnabled ? (
                  <>
                    <div className="status-message success">
                      <span className="icon">🛡️</span>
                      <div>
                        <h3>Two-Factor Authentication is Enabled</h3>
                        <p>Your account is protected with an extra layer of security.</p>
                      </div>
                    </div>
                    {!showDisable2FA ? (
                      <button className="btn btn-outline btn-block text-danger" onClick={() => setShowDisable2FA(true)}>
                        Disable 2FA
                      </button>
                    ) : (
                      <form onSubmit={handleDisable2FA} className="disable-2fa-form mt-4">
                        <div className="form-group">
                          <label>Enter Password to Confirm</label>
                          <input
                            type="password"
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            required
                            placeholder="Your password"
                          />
                        </div>
                        <div className="form-actions-flex mt-2">
                          <button type="submit" className="btn btn-primary">Confirm Disable</button>
                          <button type="button" className="btn btn-outline" onClick={() => setShowDisable2FA(false)}>Cancel</button>
                        </div>
                      </form>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-4">Two-factor authentication adds an extra layer of security to your account.</p>
                    {!show2FASetup ? (
                      <button className="btn btn-primary" onClick={start2FASetup}>Enable 2FA Security</button>
                    ) : (
                      <div className="setup-2fa-box">
                        <h3>Scan this QR Code</h3>
                        <div className="qr-container">
                          <QRCodeSVG value={qrCodeUrl} size={180} />
                        </div>
                        <p className="mb-2">Enter the 6-digit code from Google Authenticator:</p>
                        <input
                          type="text"
                          value={totpToken}
                          onChange={(e) => setTotpToken(e.target.value)}
                          placeholder="000000"
                          maxLength="6"
                          className="totp-input"
                        />
                        <div className="flex-center gap-2">
                          <button className="btn btn-primary" onClick={enable2FA}>Verify & Enable</button>
                          <button className="btn btn-outline" onClick={() => setShow2FASetup(false)}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

