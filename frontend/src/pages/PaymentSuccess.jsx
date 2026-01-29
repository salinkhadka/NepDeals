import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/Auth.jsx'
import './PaymentPages.css'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const { isAuthenticated } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId && isAuthenticated) {
      fetchOrder()
    }
  }, [orderId, isAuthenticated])

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`/api/orders/${orderId}`)
      setOrder(data.data.order)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-status success">
          <div className="status-icon">✓</div>
          <h1>Payment Successful!</h1>
          <p>Your order has been placed successfully.</p>
          
          {order && (
            <div className="order-details">
              <p><strong>Order Number:</strong> {order.orderNumber}</p>
              <p><strong>Total Amount:</strong> Rs. {order.total?.toFixed(2)}</p>
              <p><strong>Payment Status:</strong> {order.paymentStatus}</p>
            </div>
          )}

          <div className="payment-actions">
            <Link to="/orders" className="btn btn-primary">
              View Orders
            </Link>
            <Link to="/shop" className="btn btn-outline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess



