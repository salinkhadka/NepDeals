const Category = require('../models/Category');

// @desc    Get all active categories for users
// @route   GET /api/categories
// @access  Public
exports.getPublicCategories = async (req, res) => {
  try {
    // Only show categories marked as isActive
    const categories = await Category.find({ isActive: true }).select('name slug');
    
    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};