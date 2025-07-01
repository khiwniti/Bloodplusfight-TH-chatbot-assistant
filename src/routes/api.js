const express = require('express');
const router = express.Router();
const productService = require('../services/productService');
const logger = require('../services/loggerService');

// Authentication middleware for admin APIs
const authenticateAdmin = (req, res, next) => {
  // In a production app, you would verify tokens, API keys, etc.
  // For this demo, we'll use a simple API key in header
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    logger.warn('Unauthorized API access attempt', { 
      ip: req.ip, 
      path: req.path 
    });
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

// Get all products
router.get('/products', async (req, res) => {
  try {
    const language = req.query.lang || 'en';
    const products = await productService.getAllProducts(language);
    
    logger.info('Products retrieved', { count: products.length, language });
    res.status(200).json({ products });
  } catch (error) {
    logger.error('Error retrieving products', error);
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

// Get product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const language = req.query.lang || 'en';
    const product = await productService.getProductById(productId, language);
    
    if (!product) {
      logger.warn('Product not found', { productId });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product retrieved', { productId, language });
    res.status(200).json({ product });
  } catch (error) {
    logger.error('Error retrieving product', error, { productId: req.params.id });
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// Get products by category
router.get('/products/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const language = req.query.lang || 'en';
    const products = await productService.getProductsByCategory(category, language);
    
    logger.info('Products by category retrieved', { 
      category, 
      count: products.length,
      language 
    });
    
    res.status(200).json({ products });
  } catch (error) {
    logger.error('Error retrieving products by category', error, { 
      category: req.params.category 
    });
    res.status(500).json({ error: 'Failed to retrieve products by category' });
  }
});

// Create a new product (admin only)
router.post('/products', authenticateAdmin, async (req, res) => {
  try {
    // Validate required fields
    const requiredFields = ['name', 'description', 'price', 'category'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    
    const newProduct = await productService.addProduct(req.body);
    
    logger.info('Product created', { 
      productId: newProduct.productId,
      name: newProduct.name 
    });
    
    res.status(201).json({ 
      message: 'Product created successfully',
      product: newProduct 
    });
  } catch (error) {
    logger.error('Error creating product', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Update a product (admin only)
router.put('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const updatedProduct = await productService.updateProduct(productId, req.body);
    
    if (!updatedProduct) {
      logger.warn('Product not found for update', { productId });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product updated', { 
      productId,
      fields: Object.keys(req.body).join(', ') 
    });
    
    res.status(200).json({ 
      message: 'Product updated successfully',
      product: updatedProduct 
    });
  } catch (error) {
    logger.error('Error updating product', error, { productId: req.params.id });
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Delete a product (admin only)
router.delete('/products/:id', authenticateAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    const deleted = await productService.deleteProduct(productId);
    
    if (!deleted) {
      logger.warn('Product not found for deletion', { productId });
      return res.status(404).json({ error: 'Product not found' });
    }
    
    logger.info('Product deleted', { productId });
    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product', error, { productId: req.params.id });
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;