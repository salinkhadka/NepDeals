import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/Auth.jsx'
import { toast } from 'react-toastify'
import './CartPage.css'

const CartPage = () => {
  const { cart, loading, updateCartItem, removeFromCart, getCartTotal } = useCart()
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Helper to fix image paths
  const IMAGE_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

  useEffect(() => {
    if (!isAuthenticated) navigate('/login')
  }, [isAuthenticated, navigate])

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return
    const result = await updateCartItem(itemId, newQuantity)
    if (result.success) toast.success('Cart updated')
    else toast.error(result.error || 'Failed to update')
  }

  const handleRemove = async (itemId) => {
    const result = await removeFromCart(itemId)
    if (result.success) toast.success('Item removed')
    else toast.error(result.error || 'Failed to remove')
  }

  if (loading) return <div className="loading">Loading cart...</div>

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="cart-page-wrapper">
        <div className="page-container">
          <div className="empty-cart-state">
            <div className="empty-icon">🛒</div>
            <h1 className="page-title">Your Cart is Empty</h1>
            <p className="empty-text">Looks like you haven't added anything to your cart yet.</p>
            <Link to="/shop" className="btn btn-primary btn-large">Start Shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  const subtotal = getCartTotal()
  const shipping = subtotal > 1000 ? 0 : 150
  const tax = subtotal * 0.13
  const total = subtotal + shipping + tax

  return (
    <div className="cart-page-wrapper">
      <div className="page-container">
        <h1 className="page-title">Shopping Cart</h1>
        <div className="cart-layout">
          {/* Cart Items Column */}
          <div className="cart-items-column">
            <div className="cart-header-row">
              <span>Product</span>
              <span>Quantity</span>
              <span>Total</span>
              <span></span>
            </div>
            <div className="cart-items-list">
              {cart.items.map((item) => {
                if (!item.product) return null; // Safety check
                const imgUrl = item.product.images?.[0]?.startsWith('http')
                  ? item.product.images[0]
                  : `${IMAGE_BASE}${item.product.images[0]}`;

                return (
                  <div key={item._id} className="cart-item-row">
                    <div className="cart-product-info">
                      <div className="cart-thumb">
                        {item.product.images?.[0] ? (
                          <img src={imgUrl} alt={item.product.name} />
                        ) : (
                          <div className="placeholder-image">No Image</div>
                        )}
                      </div>
                      <div className="cart-details">
                        <h3>{item.product.name}</h3>
                        <p className="cart-unit-price">Rs. {item.product.price?.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="cart-quantity-control">
                      <button onClick={() => handleQuantityChange(item._id, item.quantity - 1)}>−</button>
                      <input type="text" value={item.quantity} readOnly />
                      <button onClick={() => handleQuantityChange(item._id, item.quantity + 1)}>+</button>
                    </div>

                    <div className="cart-item-total-price">
                      Rs. {(item.product.price * item.quantity).toLocaleString()}
                    </div>

                    <button className="remove-btn" onClick={() => handleRemove(item._id)} aria-label="Remove item">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart Summary Column */}
          <div className="cart-summary-column">
            <div className="cart-summary-card">
              <h3>Order Summary</h3>

              <div className="summary-details">
                <div className="summary-row"><span>Subtotal</span><span>Rs. {subtotal.toLocaleString()}</span></div>
                <div className="summary-row"><span>Shipping</span><span>{shipping === 0 ? 'Free' : `Rs. ${shipping}`}</span></div>
                <div className="summary-row"><span>Tax (13%)</span><span>Rs. {tax.toFixed(2)}</span></div>
              </div>

              <div className="summary-total">
                <span>Total</span>
                <span>Rs. {total.toFixed(2)}</span>
              </div>

              <Link to="/checkout" className="btn btn-primary btn-large btn-block checkout-btn">
                Proceed to Checkout
              </Link>

              <Link to="/shop" className="continue-shopping">
                &larr; Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage

