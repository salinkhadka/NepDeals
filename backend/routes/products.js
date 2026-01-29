const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { uploadMultiple, validateUploadedFile } = require('../middleware/fileUpload');

// Public
router.get('/', getProducts);
router.get('/:id', getProduct);

// Admin
router.post(
  '/', 
  protect, 
  authorize('admin'), 
  uploadMultiple, 
  validateUploadedFile, // Security check for file types
  createProduct
);

router.put(
  '/:id', 
  protect, 
  authorize('admin'), 
  uploadMultiple, 
  validateUploadedFile, 
  updateProduct
);

router.delete(
  '/:id', 
  protect, 
  authorize('admin'), 
  deleteProduct
);

module.exports = router;

