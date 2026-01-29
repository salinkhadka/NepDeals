const Product = require('../models/Product');
const Category = require('../models/Category');
const { escapeRegex } = require('../middleware/advancedSecurity');
const { logSecurityEvent } = require('../utils/logger');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sanitizeInput = (input, maxLength = 100) => {
  if (typeof input !== 'string') return '';
  return input.trim().substring(0, maxLength);
};

// GET /api/products (Public + Admin)
exports.getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, category, search, minPrice, maxPrice, sort = '-createdAt', showAll } = req.query;
    
    // ✅ FIX: Only filter by isActive if NOT admin view
    const query = {};
    
    // If showAll is NOT set (public view), only show active products
    if (showAll !== 'true') {
      query.isActive = true;
    }
    // If showAll === 'true' (admin view), show all products regardless of status

    if (search) {
      const searchTerm = sanitizeInput(search, 100);
      if (searchTerm.length >= 2) {
        const safeSearch = escapeRegex(searchTerm);
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { description: { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    if (category) {
      const sanitizedCategory = sanitizeInput(category, 100);
      const categoryDoc = await Category.findOne({ 
        $or: [{ slug: sanitizedCategory.toLowerCase() }, { name: sanitizedCategory }] 
      }).lean();
      
      if (categoryDoc) query.category = categoryDoc.name;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .select('-__v')
      .lean();

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: { page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), total }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// GET /api/products/:id (Public view - only active products)
exports.getProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .select('-__v')
      .populate('vendor', 'name')
      .lean();
    
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.status(200).json({ success: true, data: { product } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// POST /api/products (Secure Create)
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, comparePrice, isActive, isFeatured } = req.body;

    // Strict Validation
    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify Category Exists
    const catExists = await Category.findOne({ name: category });
    if (!catExists) return res.status(400).json({ success: false, message: 'Invalid category' });

    // Handle Images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/products/${file.filename}`);
    }

    if (images.length === 0) return res.status(400).json({ success: false, message: 'Image required' });

    const productData = {
      name: sanitizeInput(name, 200),
      description: sanitizeInput(description, 2000),
      price: parseFloat(price),
      stock: parseInt(stock),
      category: category,
      isActive: isActive === 'true' || isActive === true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      vendor: req.user._id,
      images: images
    };

    // ✅ FIX: Parse comparePrice properly
    if (comparePrice && comparePrice !== '0') {
      const cp = parseFloat(comparePrice);
      if (!isNaN(cp) && cp > 0) {
        // Validate here before saving
        if (cp < productData.price) {
          return res.status(400).json({ 
            success: false, 
            message: 'Compare price must be greater than or equal to selling price' 
          });
        }
        productData.comparePrice = cp;
      }
    }

    const product = await Product.create(productData);

    logSecurityEvent('PRODUCT_CREATED', { adminId: req.user._id, productId: product._id, ip: req.ip });
    res.status(201).json({ success: true, data: { product } });

  } catch (error) {
    // Cleanup files if DB error
    if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /api/products/:id
exports.updateProduct = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    
    let product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const updateData = { ...req.body };

    // Handle Images (Append new ones)
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
      updateData.images = [...product.images, ...newImages];
    }

    // Type Casting for Form Data
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.stock) updateData.stock = parseInt(updateData.stock);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true';
    if (updateData.isFeatured !== undefined) updateData.isFeatured = updateData.isFeatured === 'true';

    // ✅ FIX: Parse and validate comparePrice
    if (updateData.comparePrice !== undefined) {
      const cp = parseFloat(updateData.comparePrice);
      if (!isNaN(cp)) {
        if (cp > 0 && cp < updateData.price) {
          return res.status(400).json({ 
            success: false, 
            message: 'Compare price must be greater than or equal to selling price' 
          });
        }
        updateData.comparePrice = cp;
      }
    }

    // Verify Category if changed
    if (updateData.category) {
      const catExists = await Category.findOne({ name: updateData.category });
      if (!catExists) return res.status(400).json({ message: 'Invalid category' });
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    logSecurityEvent('PRODUCT_UPDATED', { adminId: req.user._id, productId: product._id, ip: req.ip });
    res.status(200).json({ success: true, data: { product } });

  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    // Delete images
    if (product.images && product.images.length > 0) {
      product.images.forEach(img => {
        const p = path.join(__dirname, '..', img);
        if (fs.existsSync(p)) fs.unlinkSync(p);
      });
    }

    await Product.findByIdAndDelete(req.params.id);
    logSecurityEvent('PRODUCT_DELETED', { adminId: req.user._id, productId: req.params.id, ip: req.ip });
    res.status(200).json({ success: true, message: 'Deleted' });

  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};







































































// const Product = require('../models/Product');
// const Category = require('../models/Category');
// const { escapeRegex } = require('../middleware/advancedSecurity');
// const { logSecurityEvent } = require('../utils/logger');
// const path = require('path');
// const fs = require('fs');
// const mongoose = require('mongoose');

// const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// const sanitizeInput = (input, maxLength = 100) => {
//   if (typeof input !== 'string') return '';
//   return input.trim().substring(0, maxLength);
// };

// // GET /api/products (Public + Admin)
// exports.getProducts = async (req, res) => {
//   try {
//     const { page = 1, limit = 12, category, search, minPrice, maxPrice, sort = '-createdAt', showAll } = req.query;
    
//     // ✅ FIX: Only filter by isActive if NOT admin view
//     const query = {};
    
//     // If showAll is NOT set (public view), only show active products
//     if (showAll !== 'true') {
//       query.isActive = true;
//     }
//     // If showAll === 'true' (admin view), show all products regardless of status

//     if (search) {
//       const searchTerm = sanitizeInput(search, 100);
//       if (searchTerm.length >= 2) {
//         const safeSearch = escapeRegex(searchTerm);
//         query.$or = [
//           { name: { $regex: safeSearch, $options: 'i' } },
//           { description: { $regex: safeSearch, $options: 'i' } }
//         ];
//       }
//     }

//     if (category) {
//       const sanitizedCategory = sanitizeInput(category, 100);
//       const categoryDoc = await Category.findOne({ 
//         $or: [{ slug: sanitizedCategory.toLowerCase() }, { name: sanitizedCategory }] 
//       }).lean();
      
//       if (categoryDoc) query.category = categoryDoc.name;
//     }

//     if (minPrice || maxPrice) {
//       query.price = {};
//       if (minPrice) query.price.$gte = parseFloat(minPrice);
//       if (maxPrice) query.price.$lte = parseFloat(maxPrice);
//     }

//     const pageNum = Math.max(1, parseInt(page) || 1);
//     const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 12));
//     const skip = (pageNum - 1) * limitNum;

//     const products = await Product.find(query)
//       .sort(sort)
//       .skip(skip)
//       .limit(limitNum)
//       .select('-__v')
//       .lean();

//     const total = await Product.countDocuments(query);

//     res.status(200).json({
//       success: true,
//       data: {
//         products,
//         pagination: { page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum), total }
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };

// // GET /api/products/:id (Public view - only active products)
// exports.getProduct = async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid ID' });
    
//     const product = await Product.findOne({ _id: req.params.id, isActive: true })
//       .select('-__v')
//       .populate('vendor', 'name')
//       .lean();
    
//     if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
//     res.status(200).json({ success: true, data: { product } });
//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };

// // POST /api/products (Secure Create)
// exports.createProduct = async (req, res) => {
//   try {
//     const { name, description, price, category, stock, comparePrice, isActive, isFeatured } = req.body;

//     // Strict Validation
//     if (!name || !description || !price || !category) {
//       return res.status(400).json({ success: false, message: 'Missing required fields' });
//     }

//     // Verify Category Exists
//     const catExists = await Category.findOne({ name: category });
//     if (!catExists) return res.status(400).json({ success: false, message: 'Invalid category' });

//     // Handle Images
//     let images = [];
//     if (req.files && req.files.length > 0) {
//       // ✅ FIX: Validate each image path
//       images = req.files.map(file => {
//         const filename = path.basename(file.filename);
//         // Prevent path traversal
//         if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
//           throw new Error('Invalid file path detected');
//         }
//         return `/uploads/products/${filename}`;
//       });
//     }

//     if (images.length === 0) {
//       return res.status(400).json({ success: false, message: 'At least one image required' });
//     }

//     // ✅ NEW: Validate image URLs don't contain scripts
//     const scriptPattern = /<script|javascript:|onerror=|onload=/i;
//     if (images.some(img => scriptPattern.test(img))) {
//       return res.status(400).json({ success: false, message: 'Invalid image data' });
//     }

//     const productData = {
//       name: sanitizeInput(name, 200),
//       description: sanitizeInput(description, 2000),
//       price: parseFloat(price),
//       stock: parseInt(stock),
//       category: category,
//       isActive: isActive === 'true' || isActive === true,
//       isFeatured: isFeatured === 'true' || isFeatured === true,
//       vendor: req.user._id,
//       images: images
//     };

//     // ✅ FIX: Parse comparePrice properly
//     if (comparePrice && comparePrice !== '0') {
//       const cp = parseFloat(comparePrice);
//       if (!isNaN(cp) && cp > 0) {
//         // Validate here before saving
//         if (cp < productData.price) {
//           return res.status(400).json({ 
//             success: false, 
//             message: 'Compare price must be greater than or equal to selling price' 
//           });
//         }
//         productData.comparePrice = cp;
//       }
//     }

//     const product = await Product.create(productData);

//     logSecurityEvent('PRODUCT_CREATED', { adminId: req.user._id, productId: product._id, ip: req.ip });
//     res.status(201).json({ success: true, data: { product } });

//   } catch (error) {
//     // Cleanup files if DB error
//     if (req.files) req.files.forEach(f => fs.unlink(f.path, () => {}));
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// // PUT /api/products/:id
// exports.updateProduct = async (req, res) => {
//   try {
//     if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid ID' });
    
//     let product = await Product.findById(req.params.id);
//     if (!product) return res.status(404).json({ message: 'Not found' });

//     const updateData = { ...req.body };

//     // Handle Images (Append new ones)
//     if (req.files && req.files.length > 0) {
//       const newImages = req.files.map(file => `/uploads/products/${file.filename}`);
//       updateData.images = [...product.images, ...newImages];
//     }

//     // Type Casting for Form Data
//     if (updateData.price) updateData.price = parseFloat(updateData.price);
//     if (updateData.stock) updateData.stock = parseInt(updateData.stock);
//     if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true';
//     if (updateData.isFeatured !== undefined) updateData.isFeatured = updateData.isFeatured === 'true';

//     // ✅ FIX: Parse and validate comparePrice
//     if (updateData.comparePrice !== undefined) {
//       const cp = parseFloat(updateData.comparePrice);
//       if (!isNaN(cp)) {
//         if (cp > 0 && cp < updateData.price) {
//           return res.status(400).json({ 
//             success: false, 
//             message: 'Compare price must be greater than or equal to selling price' 
//           });
//         }
//         updateData.comparePrice = cp;
//       }
//     }

//     // Verify Category if changed
//     if (updateData.category) {
//       const catExists = await Category.findOne({ name: updateData.category });
//       if (!catExists) return res.status(400).json({ message: 'Invalid category' });
//     }

//     product = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
//     logSecurityEvent('PRODUCT_UPDATED', { adminId: req.user._id, productId: product._id, ip: req.ip });
//     res.status(200).json({ success: true, data: { product } });

//   } catch (error) {
//     res.status(400).json({ success: false, message: error.message });
//   }
// };

// // DELETE /api/products/:id
// exports.deleteProduct = async (req, res) => {
//   try {
//     const product = await Product.findById(req.params.id);
//     if (!product) return res.status(404).json({ message: 'Not found' });

//     // Delete images
//     if (product.images && product.images.length > 0) {
//       product.images.forEach(img => {
//         const p = path.join(__dirname, '..', img);
//         if (fs.existsSync(p)) fs.unlinkSync(p);
//       });
//     }

//     await Product.findByIdAndDelete(req.params.id);
//     logSecurityEvent('PRODUCT_DELETED', { adminId: req.user._id, productId: req.params.id, ip: req.ip });
//     res.status(200).json({ success: true, message: 'Deleted' });

//   } catch (error) {
//     res.status(500).json({ success: false, message: 'Server Error' });
//   }
// };