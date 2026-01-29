import { useState, useEffect } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'
import './AdminCategories.css'

const AdminCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  // Mode State
  const [isViewMode, setIsViewMode] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form State
  const [name, setName] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/admin/categories')
      setCategories(data.data.categories)
    } catch (error) {
      toast.error('Failed to fetch categories')
    }
  }

  const resetForm = () => {
    setName('')
    setIsActive(true)
    setEditingId(null)
    setIsViewMode(false)
  }

  const handleOpenAdd = () => {
    resetForm()
    setShowModal(true)
  }

  const handleEdit = (category) => {
    resetForm()
    setEditingId(category._id)
    setName(category.name)
    setIsActive(category.isActive)
    setShowModal(true)
  }

  const handleView = (category) => {
    resetForm()
    setEditingId(category._id)
    setName(category.name)
    setIsActive(category.isActive)
    setIsViewMode(true)
    setShowModal(true)
  }

  // --- Custom Delete Logic ---
  const handleDeleteClick = (id) => {
    setDeleteId(id)
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    try {
      await api.delete(`/admin/categories/${deleteId}`)
      toast.success('Category deleted')
      fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete')
    } finally {
      setShowDeleteModal(false)
      setDeleteId(null)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const cleanName = name.trim()
    if (cleanName.length < 2) {
      toast.warning('Category name must be at least 2 characters')
      return
    }

    setLoading(true)

    const payload = {
      name: cleanName,
      isActive
    }

    try {
      if (editingId) {
        await api.put(`/admin/categories/${editingId}`, payload)
        toast.success('Category updated')
      } else {
        await api.post('/admin/categories', payload)
        toast.success('Category created')
      }
      setShowModal(false)
      fetchCategories()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-categories">
      <div className="admin-header">
        <h2>Category Management</h2>
        <button className="btn-add" onClick={handleOpenAdd}>
          + Add Category
        </button>
      </div>

      <div className="table-wrapper">
        <table className="categories-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Status</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat._id}>
                <td>{cat.name}</td>
                <td>{cat.slug}</td>
                <td>
                  <span className={`status-dot ${cat.isActive ? 'active' : 'inactive'}`}></span>
                  {cat.isActive ? 'Active' : 'Inactive'}
                </td>
                <td>{new Date(cat.createdAt).toLocaleDateString()}</td>
                <td>
                  <div className="btn-group">
                    <button className="btn-text view" onClick={() => handleView(cat)}>View</button>
                    <button className="btn-text edit" onClick={() => handleEdit(cat)}>Edit</button>
                    <button className="btn-text delete" onClick={() => handleDeleteClick(cat._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="5" className="empty-state">No categories found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-box small-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {isViewMode ? 'View Category' : (editingId ? 'Edit Category' : 'Add New Category')}
              </h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isViewMode}
                  minLength={2}
                  maxLength={50}
                  placeholder="e.g. Watches"
                  autoFocus={!isViewMode}
                />
              </div>

              <div className="checkbox-row">
                <label>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={isViewMode}
                  />
                  Active Status
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-text cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                {!isViewMode && (
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Category'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-box delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
              <button className="btn-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this category? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn-text cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn-text delete-confirm" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminCategories

