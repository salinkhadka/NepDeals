const express = require('express');
const router = express.Router();
const { getPublicCategories } = require('../controllers/categoryController');

// This route has NO middleware, so anyone can access it
router.get('/', getPublicCategories);

module.exports = router;