import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api' // Use your api service instead of axios
import './Shop.css'

const Shop = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([]) // New state for real categories
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    category: '',
    search: '',
    minPrice: '',
    maxPrice: ''
  })

  // Helper to get the base URL for images
  const API_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [filters])

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');

      // 🛡️ Logic Check: Ensure data exists before mapping/filtering
      if (data && data.success && data.data.categories) {
        // If your backend already filters by isActive, you don't need .filter() here
        // but it is safer to keep it.
        setCategories(data.data.categories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Prevent map error if request fails
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      if (filters.minPrice) params.append('minPrice', filters.minPrice)
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice)

      const { data } = await api.get(`/products?${params.toString()}`)
      setProducts(data.data.products)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    })
  }

  if (loading && products.length === 0) {
    return <div className="loading">Loading products...</div>
  }

  return (
    <div className="shop-page">
      <div className="page-container">
        <header className="shop-header">
          <h1 className="page-title">Shop Collection</h1>
          <p className="page-subtitle">Find your perfect item from our curated selection</p>
        </header>

        <div className="shop-layout-modern">
          {/* Horizontal Filter Bar */}
          <div className="filters-toolbar">

            {/* Left: Big Search Bar */}
            <div className="search-wrapper-modern expanded-search">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                name="search"
                placeholder="Search products..."
                value={filters.search}
                onChange={handleFilterChange}
                className="modern-search-input"
              />
            </div>

            {/* Right: Filters + Reset */}
            <div className="filters-right-group">
              <div className="filter-dropdowns">
                <select
                  name="category"
                  value={filters.category}
                  onChange={handleFilterChange}
                  className="modern-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>

                <div className="price-range-mini">
                  <input type="number" name="minPrice" placeholder="Min" value={filters.minPrice} onChange={handleFilterChange} className="mini-input" />
                  <span>-</span>
                  <input type="number" name="maxPrice" placeholder="Max" value={filters.maxPrice} onChange={handleFilterChange} className="mini-input" />
                </div>
              </div>

              <button className="clear-filters-btn" onClick={() => setFilters({ category: '', search: '', minPrice: '', maxPrice: '' })}>
                Reset
              </button>
            </div>

          </div>

          {/* Product Grid */}
          <main className="product-listing full-width">
            {products.length === 0 ? (
              <div className="no-products-state">
                <div className="empty-icon">🧥</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters to find what you're looking for.</p>
              </div>
            ) : (
              <div className="products-grid">
                {products.map((product) => (
                  <Link key={product._id} to={`/product/${product._id}`} className="product-card">
                    <div className="product-card-image">
                      {product.images && product.images[0] ? (
                        <img
                          src={product.images[0].startsWith('http') ? product.images[0] : `${API_BASE}${product.images[0]}`}
                          alt={product.name}
                          loading="lazy"
                        />
                      ) : (
                        <div className="placeholder-image">
                          <span>No Image</span>
                        </div>
                      )}

                      {/* Optional: Add badge if new or discount */}
                      {/* <span className="product-badge">New</span> */}
                    </div>

                    <div className="product-card-info">
                      <div className="product-meta">
                        <span className="product-category-label">{product.category}</span>
                      </div>
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-footer">
                        <span className="product-price">Rs. {product.price.toLocaleString()}</span>
                        <span className="view-btn">View &rarr;</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default Shop

