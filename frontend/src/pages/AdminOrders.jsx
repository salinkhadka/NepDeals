import { useState, useEffect } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'
import './AdminOrders.css'

const AdminOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/admin/orders')
      setOrders(data.data.orders)
    } catch (error) {
      toast.error('Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}`, { orderStatus: newStatus })
      toast.success('Order status updated')
      fetchOrders()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update order status')
    }
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setShowViewModal(true)
  }

  const getImgUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL.replace('/api', '')}${path}`;
  }

  if (loading) {
    return <div className="loading">Loading orders...</div>
  }

  return (
    <div className="admin-orders">
      <h2>Order Management</h2>
      <div className="orders-table">
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order._id}>
                <td>{order.orderNumber}</td>
                <td>{order.user?.name || 'N/A'}</td>
                <td>{order.items?.length || 0}</td>
                <td>NPR {order.total?.toFixed(2)}</td>
                <td>
                  <select
                    value={order.orderStatus}
                    onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                    className={`status-select ${order.orderStatus}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
                <td>
                  <span className={`payment-badge ${order.paymentStatus}`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn-view" onClick={() => handleViewOrder(order)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View Order Modal */}
      {showViewModal && selectedOrder && (
        <div className="modal-backdrop" onClick={() => setShowViewModal(false)}>
          <div className="modal-box large-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Order Details - #{selectedOrder.orderNumber}</h3>
              <button className="btn-close" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="order-detail-grid">
                {/* Customer Info */}
                <div className="detail-section">
                  <h4>Customer Information</h4>
                  <p><strong>Name:</strong> {selectedOrder.shippingAddress?.fullName}</p>
                  <p><strong>Email:</strong> {selectedOrder.user?.email}</p>
                  <p><strong>Phone:</strong> {selectedOrder.shippingAddress?.phone}</p>
                </div>

                {/* Shipping Address */}
                <div className="detail-section">
                  <h4>Shipping Address</h4>
                  <p>{selectedOrder.shippingAddress?.address}</p>
                  <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}</p>
                  <p>{selectedOrder.shippingAddress?.postalCode}</p>
                  <p>{selectedOrder.shippingAddress?.country}</p>
                </div>

                {/* Order Items */}
                <div className="detail-section full-width">
                  <h4>Order Items</h4>
                  <div className="order-items-list">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="order-item-card">
                        <img src={getImgUrl(item.image)} alt={item.name} />
                        <div className="item-info">
                          <h5>{item.name}</h5>
                          <p>Price: Rs. {item.price} x {item.quantity}</p>
                          <p>Subtotal: Rs. {(item.price * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="detail-section">
                  <h4>Payment Summary</h4>
                  <p><strong>Subtotal:</strong> Rs. {selectedOrder.subtotal?.toFixed(2)}</p>
                  <p><strong>Shipping:</strong> Rs. {selectedOrder.shippingCost?.toFixed(2)}</p>
                  <p><strong>Tax:</strong> Rs. {selectedOrder.tax?.toFixed(2)}</p>
                  {selectedOrder.discount > 0 && (
                    <p style={{color: '#4ade80'}}><strong>Discount:</strong> -Rs. {selectedOrder.discount?.toFixed(2)}</p>
                  )}
                  <p className="total-line"><strong>Total:</strong> Rs. {selectedOrder.total?.toFixed(2)}</p>
                </div>

                {/* Status Info */}
                <div className="detail-section">
                  <h4>Order Status</h4>
                  <p><strong>Order Status:</strong> {selectedOrder.orderStatus}</p>
                  <p><strong>Payment Status:</strong> {selectedOrder.paymentStatus}</p>
                  <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
                  {selectedOrder.notes && <p><strong>Notes:</strong> {selectedOrder.notes}</p>}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-text cancel" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminOrders

