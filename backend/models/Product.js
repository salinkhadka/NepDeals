const mongoose = require('mongoose');
const { monitorQuery } = require('../utils/queryMonitor');

// ==========================================
// PRODUCT MODEL - FULLY SECURED
// ==========================================
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [200, 'Name cannot exceed 200 characters'],
    validate: {
      validator: function(v) {
        return /^[a-zA-Z0-9\s\-_.,'&()]+$/.test(v);
      },
      message: 'Name contains invalid characters'
    }
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [5000, 'Description too long']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0.01, 'Price must be at least 0.01'],
    max: [10000000, 'Price exceeds maximum'],
    validate: {
      validator: function(v) {
        return Number.isFinite(v) && /^\d+(\.\d{1,2})?$/.test(v.toFixed(2));
      },
      message: 'Invalid price format (max 2 decimals)'
    }
  },
  comparePrice: {
    type: Number,
    default: 0,
    min: [0, 'Compare price cannot be negative'],
    max: [10000000, 'Compare price too high']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category name too long'],
    index: true
  },
  images: {
    type: [String],
    required: [true, 'At least one image is required'],
    validate: [
      {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0 && v.length <= 10;
        },
        message: 'Product must have 1-10 images'
      },
      {
        validator: function(v) {
          return v.every(url => 
            typeof url === 'string' && 
            url.length <= 500 &&
            (/^https?:\/\/.+/.test(url) || /^\/uploads\/.+/.test(url))
          );
        },
        message: 'Invalid image URL format'
      }
    ]
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    max: [1000000, 'Stock value too high'],
    default: 0,
    validate: {
      validator: function(v) {
        return Number.isInteger(v);
      },
      message: 'Stock must be a whole number'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Vendor is required'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1, price: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ stock: 1 });

// Generate slug before saving
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    if (!this.slug || this.slug.length < 2) {
      this.slug = `product-${Date.now()}`;
    }
  }
  
  // Validate comparePrice
  if (this.comparePrice > 0 && this.comparePrice <= this.price) {
    return next(new Error('Compare price must be greater than selling price'));
  }
  
  // Round price to 2 decimals
  this.price = Math.round(this.price * 100) / 100;
  if (this.comparePrice > 0) {
    this.comparePrice = Math.round(this.comparePrice * 100) / 100;
  }
  
  next();
});

// Prevent invalid updates
productSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  
  if (update.$set) {
    if (update.$set.price !== undefined) {
      const price = Number(update.$set.price);
      if (!Number.isFinite(price) || price < 0.01 || price > 10000000) {
        return next(new Error('Invalid price value'));
      }
      update.$set.price = Math.round(price * 100) / 100;
    }
    
    if (update.$set.stock !== undefined) {
      const stock = Number(update.$set.stock);
      if (!Number.isInteger(stock) || stock < 0 || stock > 1000000) {
        return next(new Error('Invalid stock value'));
      }
    }
    
    if (update.$set.comparePrice !== undefined && update.$set.price !== undefined) {
      if (update.$set.comparePrice > 0 && update.$set.comparePrice <= update.$set.price) {
        return next(new Error('Compare price must be greater than selling price'));
      }
    }
  }
  
  next();
});

productSchema.pre('find', function() {
  monitorQuery('Product', 'find', this.getQuery());
});

productSchema.pre('findOne', function() {
  monitorQuery('Product', 'findOne', this.getQuery());
});

module.exports = mongoose.model('Product', productSchema);

