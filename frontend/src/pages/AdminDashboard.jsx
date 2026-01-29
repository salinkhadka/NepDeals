import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api' // Secure API import
import { useAuth } from '../context/Auth.jsx'

// Sub-components
import AdminProducts from './AdminProducts'
import AdminCategories from './AdminCategories'
import AdminOrders from './AdminOrders'
import AdminUsers from './AdminUsers'
import AdminCoupons from './AdminCoupons'
import AdminLogs from './AdminLogs'

import './AdminDashboard.css'

const AdminDashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    if (user?.role !== 'admin') {
      navigate('/')
      return
    }

    fetchDashboard()
  }, [isAuthenticated, user, navigate])

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/admin/dashboard')
      setStats(data.data)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading Admin Dashboard...</div>
  }

  return (
    <div className="admin-dashboard-wrapper">
      <div className="page-container admin-layout">
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h2>Admin Panel</h2>
          </div>
          <nav className="sidebar-nav">
            <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
              <span className="icon">📊</span> Dashboard
            </button>
            <button className={activeTab === 'products' ? 'active' : ''} onClick={() => setActiveTab('products')}>
              <span className="icon">📦</span> Products
            </button>
            <button className={activeTab === 'categories' ? 'active' : ''} onClick={() => setActiveTab('categories')}>
              <span className="icon">🏷️</span> Categories
            </button>
            <button className={activeTab === 'coupons' ? 'active' : ''} onClick={() => setActiveTab('coupons')}>
              <span className="icon">🎟️</span> Coupons
            </button>
            <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
              <span className="icon">🛍️</span> Orders
            </button>
            <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
              <span className="icon">👥</span> Users
            </button>
            <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>
              <span className="icon">📜</span> Logs
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="admin-content">
          <header className="content-header">
            <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          </header>

          <div className="content-body">
            {activeTab === 'dashboard' && stats && (
              <div className="dashboard-stats-grid">
                <div className="stat-card">
                  <div className="stat-icon users">👥</div>
                  <div className="stat-info">
                    <h3>Total Users</h3>
                    <p className="stat-value">{stats.stats.totalUsers}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon products">📦</div>
                  <div className="stat-info">
                    <h3>Total Products</h3>
                    <p className="stat-value">{stats.stats.totalProducts}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon orders">🛍️</div>
                  <div className="stat-info">
                    <h3>Total Orders</h3>
                    <p className="stat-value">{stats.stats.totalOrders}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon revenue">💰</div>
                  <div className="stat-info">
                    <h3>Total Revenue</h3>
                    <p className="stat-value">Rs. {stats.stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content Components */}
            {activeTab === 'products' && <AdminProducts />}
            {activeTab === 'categories' && <AdminCategories />}
            {activeTab === 'coupons' && <AdminCoupons />}
            {activeTab === 'orders' && <AdminOrders />}
            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'logs' && <AdminLogs />}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard