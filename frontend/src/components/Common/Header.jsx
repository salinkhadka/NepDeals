import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/Auth.jsx'
import { useCart } from '../../context/CartContext'
import './Header.css'

const Header = () => {
  const { user, logout, isAuthenticated, loading } = useAuth()
  const { getCartItemCount } = useCart()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setMobileMenuOpen(false)
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  if (loading) {
    return (
      <header className="header">
        <div className="page-container">
          <div className="header-wrapper">
            <Link to="/" className="logo">
              <span className="logo-text">NEPDEALS</span>
              <span className="logo-accent">NP</span>
            </Link>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="header">
      <div className="page-container">
        <div className="header-wrapper">
          {/* Logo Section */}
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            <span className="logo-text">NEPDEALS</span>
            <span className="logo-accent">NP</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="nav-desktop">
            <Link to="/" className="nav-link">Home</Link>
            <Link to="/shop" className="nav-link">Shop</Link>
            {isAuthenticated && (
              <>
                <Link to="/orders" className="nav-link">Orders</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="nav-link">Admin</Link>
                )}
              </>
            )}
          </nav>

          {/* Right Actions: Cart & Auth */}
          <div className="header-actions">
            <Link to="/cart" className="cart-icon" onClick={closeMobileMenu}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              {isAuthenticated && getCartItemCount() > 0 && (
                <span className="cart-badge">{getCartItemCount()}</span>
              )}
            </Link>

            {/* Desktop User Menu / Auth Buttons */}
            <div className="desktop-auth">
              {isAuthenticated ? (
                <div className="user-menu">
                  <Link to="/profile" className="nav-link user-name">
                    {user?.name || 'Profile'}
                  </Link>
                  <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
              ) : (
                <div className="auth-buttons">
                  <Link to="/login" className="btn btn-outline">Login</Link>
                  <Link to="/register" className="btn btn-primary">Sign Up</Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle navigation"
            >
              <svg
                className={`menu-icon ${mobileMenuOpen ? 'open' : ''}`}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                {mobileMenuOpen ? (
                  <path d="M18 6L6 18M6 6l12 12"></path>
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18"></path>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className={`mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
          <div className="mobile-nav-inner">
            <Link to="/" className="mobile-nav-link" onClick={closeMobileMenu}>Home</Link>
            <Link to="/shop" className="mobile-nav-link" onClick={closeMobileMenu}>Shop</Link>
            {isAuthenticated && (
              <>
                <Link to="/orders" className="mobile-nav-link" onClick={closeMobileMenu}>Orders</Link>
                <Link to="/profile" className="mobile-nav-link" onClick={closeMobileMenu}>Profile</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="mobile-nav-link" onClick={closeMobileMenu}>Admin Dashboard</Link>
                )}
                <div className="mobile-user-actions">
                  <span className="mobile-user-name">Hi, {user?.name}</span>
                  <button onClick={handleLogout} className="btn btn-outline btn-block">Logout</button>
                </div>
              </>
            )}
            {!isAuthenticated && (
              <div className="mobile-auth-buttons">
                <Link to="/login" className="btn btn-outline btn-block" onClick={closeMobileMenu}>Login</Link>
                <Link to="/register" className="btn btn-primary btn-block" onClick={closeMobileMenu}>Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header