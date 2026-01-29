import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/Auth.jsx';
import { toast } from 'react-toastify';
import './OrdersPage.css';

const OrdersPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const IMAGE_BASE = import.meta.env.VITE_API_URL.replace('/api', '');

  const getImgUrl = (path) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${IMAGE_BASE}${path}`;
  };

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/orders');
      const actualOrders = data.data?.orders || data.data || [];
      setOrders(Array.isArray(actualOrders) ? actualOrders : []);
    } catch (error) {
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetails = async (id) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/orders/${id}`);
      setSelectedOrder(data.data);
    } catch (error) {
      toast.error('Could not load details');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedOrder && orders.length === 0) {
    return <div className="lux-loader">Acquiring Data...</div>;
  }

  if (selectedOrder) {
    const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
    const activeStep = steps.indexOf(selectedOrder.orderStatus);

    return (
      <div className="order-single-container">
        <div className="container">
          <button className="back-btn" onClick={() => setSelectedOrder(null)}>← BACK TO COLLECTION</button>

          <div className="order-hero">
            <h1>Acquisition #{selectedOrder.orderNumber}</h1>
            <p>Confirmed on {new Date(selectedOrder.createdAt).toDateString()}</p>
          </div>

          <div className="status-progress-bar">
            {steps.map((step, i) => (
              <div key={step} className={`progress-step ${i <= activeStep ? 'active' : ''}`}>
                <div className="circle"></div>
                <label>{step}</label>
              </div>
            ))}
          </div>

          <div className="order-content-grid">
            <div className="items-box">
              <h3>Items in this Shipment</h3>
              {selectedOrder.items.map((item, i) => (
                <div key={i} className="detail-item-card">
                  <img src={getImgUrl(item.image)} alt={item.name} />
                  <div className="item-txt">
                    <h4>{item.name}</h4>
                    <p>Rs. {item.price.toLocaleString()} x {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="summary-sidebar">
              <div className="info-card">
                <h4>Financial Summary</h4>
                <div className="s-row"><span>Subtotal</span><span>Rs. {selectedOrder.subtotal?.toLocaleString()}</span></div>

                {/* ✅ SHIPPING ROW ADDED HERE */}
                <div className="s-row">
                  <span>Shipping</span>
                  <span>{selectedOrder.shippingCost === 0 ? 'FREE' : `Rs. ${selectedOrder.shippingCost}`}</span>
                </div>

                <div className="s-row"><span>Tax</span><span>Rs. {selectedOrder.tax?.toLocaleString()}</span></div>

                {selectedOrder.discount > 0 && (
                  <div className="s-row" style={{ color: '#10B981' }}><span>Discount</span><span>- Rs. {selectedOrder.discount?.toLocaleString()}</span></div>
                )}

                <div className="s-row total"><span>Total</span><span>Rs. {selectedOrder.total?.toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page-container">
      <div className="container">
        <header className="page-header">
          <h1 className="gold-title">My Orders</h1>
        </header>

        {orders.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '100px' }}>
            <p className="mb-4">Your history is currently empty.</p>
            <Link to="/shop" className="btn btn-primary">Explore Shop</Link>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order._id} className="lux-order-card">
                <div className="card-info">
                  <h3>#{order.orderNumber}</h3>
                  <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                  <p className="price-tag">Rs. {order.total.toLocaleString()}</p>
                </div>
                <div className="card-actions">
                  <span className={`status-tag ${order.orderStatus}`}>{order.orderStatus}</span>
                  <button className="btn-view" onClick={() => fetchDetails(order._id)}>View Details</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;

