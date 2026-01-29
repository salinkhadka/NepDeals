import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../services/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/Auth.jsx'
import { toast } from 'react-toastify'
import './ProductPage.css'

const ProductPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isAuthenticated } = useAuth()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  const IMAGE_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/products/${id}`)
      setProduct(data.data.product)
    } catch (error) {
      toast.error('Product not found')
    } finally {
      setLoading(false)
    }
  }

  const getFullImgPath = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${IMAGE_BASE}${path}`;
  }

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add items to cart')
      navigate('/login'); return;
    }
    const result = await addToCart(product._id, quantity)
    if (result.success) toast.success('Added to cart!')
    else toast.error(result.error || 'Failed to add')
  }

  if (loading) return <div className="loading">Loading...</div>
  if (!product) return <div className="error">Product not found</div>

  return (
    <div className="product-page-wrapper">
      <div className="page-container">
        <div className="product-detail-layout">
          {/* Left Column: Images */}
          <div className="product-gallery">
            <div className="main-image-frame">
              {product.images?.[selectedImage] ? (
                <img src={getFullImgPath(product.images[selectedImage])} alt={product.name} />
              ) : <div className="placeholder-image">No Image</div>}
              {product.stock === 0 && <span className="stock-badge out">Out of Stock</span>}
            </div>
            {product.images?.length > 1 && (
              <div className="thumbnail-strip">
                {product.images.map((img, index) => (
                  <button
                    key={index}
                    className={`thumbnail-btn ${selectedImage === index ? 'active' : ''}`}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img
                      src={getFullImgPath(img)}
                      alt={`Thumbnail ${index + 1}`}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Info */}
          <div className="product-info-panel">
            <div className="product-header">
              <span className="product-category-tag">{product.category}</span>
              <h1 className="product-title">{product.name}</h1>
              <div className="product-rating">
                {/* Placeholder for rating if needed in future */}
                <span className="stars">★★★★☆</span>
                <span className="review-count">(24 reviews)</span>
              </div>
            </div>

            <div className="product-price-box">
              <span className="current-price">Rs. {product.price.toLocaleString()}</span>
              {product.comparePrice > product.price && (
                <div className="discount-info">
                  <span className="original-price">Rs. {product.comparePrice.toLocaleString()}</span>
                  <span className="save-badge">Save {Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)}%</span>
                </div>
              )}
            </div>

            <div className="product-description-block">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            <div className="product-purchase-area">
              <div className="stock-indicator">
                {product.stock > 0 ? (
                  <span className="status-dot green"></span>
                ) : <span className="status-dot red"></span>}
                <span>{product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}</span>
              </div>

              <div className="action-row">
                <div className="quantity-control">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>−</button>
                  <input type="number" value={quantity} readOnly />
                  <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={quantity >= product.stock}>+</button>
                </div>
                <button
                  className="btn btn-primary btn-add-cart"
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                >
                  {product.stock === 0 ? 'Sold Out' : 'Add to Cart'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default ProductPage

