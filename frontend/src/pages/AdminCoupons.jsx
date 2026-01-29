import { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import './AdminCoupons.css';

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    code: '', type: 'percentage', value: '', minOrderValue: '',
    maxDiscount: '', expiresAt: '', usageLimit: 100, oneTimeUse: false, isActive: true
  });

  useEffect(() => { fetchCoupons(); }, []);

  const fetchCoupons = async () => {
    try {
      const { data } = await api.get('/admin/coupons');
      setCoupons(data.data.coupons || []);
    } catch (e) { toast.error('Fetch failed'); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...formData, code: formData.code.toUpperCase().trim() };
      if (editingId) await api.put(`/admin/coupons/${editingId}`, payload);
      else await api.post('/admin/coupons', payload);
      
      toast.success('Coupon Saved Successfully');
      setShowModal(false);
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error saving');
    } finally { setLoading(false); }
  };

  const handleEdit = (c) => {
    setEditingId(c._id);
    setFormData({
      code: c.code, type: c.type, value: c.value,
      minOrderValue: c.minOrderValue || '',
      maxDiscount: c.maxDiscount || '',
      usageLimit: c.usageLimit,
      oneTimeUse: c.oneTimeUse,
      isActive: c.isActive,
      expiresAt: c.expiresAt?.split('T')[0]
    });
    setShowModal(true);
  };

  const viewLogs = (logs) => {
    setSelectedLogs(logs);
    setShowLogModal(true);
  };

  return (
    <div className="admin-coupons container">
      <div className="admin-header">
        <h2>Coupon Management</h2>
        <button className="btn-add" onClick={() => { setEditingId(null); setShowModal(true); }}>+ Create Coupon</button>
      </div>

      <div className="table-wrapper">
        <table className="coupons-table">
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Limit</th><th>Used</th><th>Logs</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {coupons.map(c => (
              <tr key={c._id}>
                <td className="code-cell">{c.code}</td>
                <td>{c.value}{c.type === 'percentage' ? '%' : 'Rs'}</td>
                <td>{c.usageLimit}</td>
                <td>{c.usedBy?.length || 0}</td>
                <td>
                   <button className="btn-text view" onClick={() => viewLogs(c.usedBy)}>View Logs</button>
                </td>
                <td><span className={`status-dot ${c.isActive ? 'active' : 'inactive'}`}></span></td>
                <td><button className="btn-text edit" onClick={() => handleEdit(c)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-box medium-modal">
            <div className="modal-header">
              <h3>{editingId ? 'Edit Coupon' : 'New Coupon'}</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Code</label>
                <input name="code" value={formData.code} onChange={handleInputChange} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Rs.</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Value</label>
                  <input type="number" name="value" value={formData.value} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="form-row">
                 <div className="form-group"><label>Min Order</label><input type="number" name="minOrderValue" value={formData.minOrderValue} onChange={handleInputChange} /></div>
                 <div className="form-group"><label>Limit</label><input type="number" name="usageLimit" value={formData.usageLimit} onChange={handleInputChange} required /></div>
              </div>
              <div className="form-group"><label>Expiry</label><input type="date" name="expiresAt" value={formData.expiresAt} onChange={handleInputChange} required /></div>
              <div className="checkbox-row">
                <label><input type="checkbox" name="oneTimeUse" checked={formData.oneTimeUse} onChange={handleInputChange} /> One Time/User</label>
                <label><input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleInputChange} /> Active</label>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- USAGE LOGS MODAL --- */}
      {showLogModal && (
        <div className="modal-backdrop">
          <div className="modal-box large-modal">
            <div className="modal-header">
              <h3>Coupon Usage History</h3>
              <button className="btn-close" onClick={() => setShowLogModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <table className="coupons-table">
                <thead><tr><th>User</th><th>Email</th><th>Applied On Products</th><th>Date</th></tr></thead>
                <tbody>
                  {selectedLogs.map((log, i) => (
                    <tr key={i}>
                      <td>{log.user?.name}</td>
                      <td>{log.user?.email}</td>
                      <td>{log.appliedProducts?.map(p => p.name).join(', ')}</td>
                      <td>{new Date(log.usedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {selectedLogs.length === 0 && <p className="empty-state">No one has used this coupon yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminCoupons;