import { useState, useEffect } from 'react'
import api from '../services/api'
import { toast } from 'react-toastify'
import './AdminProducts.css'

const AdminProducts = () => {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isViewMode, setIsViewMode] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [comparePrice, setComparePrice] = useState(0)
  const [stock, setStock] = useState('')
  const [category, setCategory] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isFeatured, setIsFeatured] = useState(false)
  
  // Image State
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  const fetchProducts = async () => {
    try {
      // ✅ FIX: Add showAll=true to get ALL products (including inactive)
      const { data } = await api.get('/products?showAll=true')
      setProducts(data.data.products)
    } catch (error) {
      toast.error('Failed to fetch products')
    }
  }

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/admin/categories')
      setCategories(data.data.categories)
    } catch (error) {
      console.error(error)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files are allowed')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size too large (Max 5MB)')
        return
      }
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (Number(comparePrice) > 0 && Number(comparePrice) < Number(price)) {
      toast.error('Compare price must be greater than selling price')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('name', name.trim())
    formData.append('description', description.trim())
    formData.append('price', price)
    formData.append('comparePrice', comparePrice)
    formData.append('category', category)
    formData.append('stock', stock)
    formData.append('isActive', isActive)
    formData.append('isFeatured', isFeatured)
    
    if (imageFile) {
      formData.append('images', imageFile)
    }

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Product updated')
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        toast.success('Product created')
      }
      closeModal()
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
    setIsViewMode(false)
    setName('')
    setDescription('')
    setPrice('')
    setComparePrice(0)
    setStock('')
    setCategory('')
    setIsActive(true)
    setIsFeatured(false)
    setImageFile(null)
    setImagePreview(null)
  }

  const handleEdit = (product) => {
    setIsViewMode(false)
    setEditingProduct(product)
    loadProductData(product)
    setShowModal(true)
  }

  const handleView = (product) => {
    setIsViewMode(true)
    setEditingProduct(product)
    loadProductData(product)
    setShowModal(true)
  }

  const loadProductData = (product) => {
    setName(product.name)
    setDescription(product.description)
    setPrice(product.price)
    setComparePrice(product.comparePrice || 0)
    setStock(product.stock)
    setCategory(product.category)
    setIsActive(product.isActive)
    setIsFeatured(product.isFeatured)
    
    if (product.images && product.images.length > 0) {
       const imgPath = product.images[0].startsWith('http') 
         ? product.images[0] 
         : `${import.meta.env.VITE_API_URL.replace('/api', '')}${product.images[0]}`
       setImagePreview(imgPath)
    } else {
       setImagePreview(null)
    }
  }

  const handleDelete = async (id) => {
    if(!window.confirm('Are you sure you want to delete this product?')) return
    try {
      await api.delete(`/products/${id}`)
      toast.success('Product deleted')
      fetchProducts()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete')
    }
  }

  return (
    <div className="admin-products">
      <div className="admin-header">
        <h2>Product Inventory</h2>
        <button className="btn-add" onClick={() => { closeModal(); setShowModal(true); }}>
          + Add Product
        </button>
      </div>

      <div className="table-wrapper">
        <table className="products-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Compare</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p._id} className={!p.isActive ? 'inactive-row' : ''}>
                <td>
                  <div className="table-img">
                    {p.images && p.images.length > 0 ? (
                      <img 
                        src={`${import.meta.env.VITE_API_URL.replace('/api', '')}${p.images[0]}`} 
                        alt={p.name} 
                        onError={(e) => e.target.src = '/placeholder.png'}
                      />
                    ) : <div className="no-img">No Img</div>}
                  </div>
                </td>
                <td>{p.name}</td>
                <td>{p.category}</td>
                <td>Rs. {p.price.toLocaleString()}</td>
                <td>{p.comparePrice > 0 ? `Rs. ${p.comparePrice.toLocaleString()}` : '-'}</td>
                <td>{p.stock}</td>
                <td>
                  <span className={`status-dot ${p.isActive ? 'active' : 'inactive'}`}></span>
                  {p.isActive ? 'Active' : 'Inactive'}
                </td>
                <td>
                  <div className="btn-group">
                    <button className="btn-text view" onClick={() => handleView(p)}>View</button>
                    <button className="btn-text edit" onClick={() => handleEdit(p)}>Edit</button>
                    <button className="btn-text delete" onClick={() => handleDelete(p._id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan="8" className="empty">No products found</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{isViewMode ? 'View Product' : (editingProduct ? 'Edit Product' : 'Add New Product')}</h3>
              <button className="btn-close" onClick={closeModal}>×</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-layout">
                <div className="form-col-image">
                  <label htmlFor="file-upload" className="image-uploader">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" />
                    ) : (
                      <div className="placeholder">
                        <span>📷</span>
                        <small>Upload Image (1-5)</small>
                      </div>
                    )}
                  </label>
                  <input 
                    id="file-upload" 
                    type="file" 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    hidden 
                    disabled={isViewMode}
                    required={!editingProduct && !isViewMode} 
                  />
                </div>

                <div className="form-col-inputs">
                  <div className="form-group">
                    <label>Name</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required 
                      disabled={isViewMode}
                      minLength={2}
                      maxLength={200}
                      pattern="^[a-zA-Z0-9\s-_.,'&]+$"
                      title="Letters, numbers, spaces and basic punctuation only"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Price</label>
                      <input 
                        type="number" 
                        value={price} 
                        onChange={e => setPrice(e.target.value)} 
                        required 
                        disabled={isViewMode}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="form-group">
                      <label>Compare Price</label>
                      <input 
                        type="number" 
                        value={comparePrice} 
                        onChange={e => setComparePrice(e.target.value)} 
                        disabled={isViewMode}
                        min="0"
                        step="0.01"
                        placeholder="0 for none"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock</label>
                      <input 
                        type="number" 
                        value={stock} 
                        onChange={e => setStock(e.target.value)} 
                        required 
                        disabled={isViewMode}
                        min="0"
                        step="1"
                      />
                    </div>
                    <div className="form-group">
                      <label>Category</label>
                      <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)} 
                        required 
                        disabled={isViewMode}
                      >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c._id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      required 
                      rows="4" 
                      disabled={isViewMode}
                      maxLength={2000}
                    />
                  </div>

                  <div className="checkbox-row">
                    <label>
                      <input 
                        type="checkbox" 
                        checked={isActive} 
                        onChange={e => setIsActive(e.target.checked)} 
                        disabled={isViewMode} 
                      /> 
                      Active
                    </label>
                    <label>
                      <input 
                        type="checkbox" 
                        checked={isFeatured} 
                        onChange={e => setIsFeatured(e.target.checked)} 
                        disabled={isViewMode} 
                      /> 
                      Featured
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-text cancel" onClick={closeModal}>Cancel</button>
                {!isViewMode && (
                  <button type="submit" className="btn-submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Product'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProducts

