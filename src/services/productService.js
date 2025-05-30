// In-memory database for products and customers
const db = {
  products: [
    {
      productId: 'p001',
      name: 'Premium Coffee',
      nameTh: 'กาแฟพรีเมียม',
      description: 'High-quality arabica coffee beans, freshly roasted',
      descriptionTh: 'เมล็ดกาแฟอาราบิก้าคุณภาพสูง คั่วสดใหม่',
      price: 12.99,
      category: 'Beverages',
      categoryTh: 'เครื่องดื่ม',
      imageUrl: 'https://example.com/images/coffee.jpg',
      inStock: true
    },
    {
      productId: 'p002',
      name: 'Organic Tea Set',
      nameTh: 'ชุดชาออร์แกนิค',
      description: 'Collection of 5 different organic tea flavors',
      descriptionTh: 'คอลเลคชันชาออร์แกนิค 5 รสชาติ',
      price: 15.99,
      category: 'Beverages',
      categoryTh: 'เครื่องดื่ม',
      imageUrl: 'https://example.com/images/tea.jpg',
      inStock: true
    },
    {
      productId: 'p003',
      name: 'Bluetooth Headphones',
      nameTh: 'หูฟังบลูทูธ',
      description: 'Wireless headphones with noise cancellation',
      descriptionTh: 'หูฟังไร้สายพร้อมระบบตัดเสียงรบกวน',
      price: 89.99,
      category: 'Electronics',
      categoryTh: 'อิเล็กทรอนิกส์',
      imageUrl: 'https://example.com/images/headphones.jpg',
      inStock: true
    },
    {
      productId: 'p004',
      name: 'Fitness Tracker',
      nameTh: 'อุปกรณ์ติดตามการออกกำลังกาย',
      description: 'Water-resistant fitness and sleep tracker with heart rate monitor',
      descriptionTh: 'อุปกรณ์ติดตามการออกกำลังกายและการนอนกันน้ำพร้อมระบบวัดอัตราการเต้นของหัวใจ',
      price: 49.99,
      category: 'Electronics',
      categoryTh: 'อิเล็กทรอนิกส์',
      imageUrl: 'https://example.com/images/tracker.jpg',
      inStock: false
    },
    {
      productId: 'p005',
      name: 'Scented Candle Set',
      nameTh: 'ชุดเทียนหอม',
      description: 'Set of 3 aromatherapy candles with essential oils',
      descriptionTh: 'ชุดเทียนหอมบำบัด 3 ชิ้นผสมน้ำมันหอมระเหย',
      price: 24.99,
      category: 'Home',
      categoryTh: 'ของใช้ในบ้าน',
      imageUrl: 'https://example.com/images/candles.jpg',
      inStock: true
    }
  ],
  customers: {},
  purchases: {}
};

/**
 * Get all products
 * @param {string} language - Language code (en or th)
 * @returns {Promise<Array>} - List of products
 */
const getAllProducts = async (language = 'en') => {
  if (language === 'th') {
    return db.products.map(product => ({
      id: product.productId,
      name: product.nameTh || product.name,
      description: product.descriptionTh || product.description,
      price: product.price,
      category: product.categoryTh || product.category,
      imageUrl: product.imageUrl,
      inStock: product.inStock
    }));
  }
  return db.products.map(product => ({
    id: product.productId,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    inStock: product.inStock
  }));
};

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @param {string} language - Language code (en or th)
 * @returns {Promise<Object|null>} - Product object or null if not found
 */
const getProductById = async (productId, language = 'en') => {
  const product = db.products.find(p => p.productId === productId);
  if (!product) return null;
  if (language === 'th') {
    return {
      id: product.productId,
      name: product.nameTh || product.name,
      description: product.descriptionTh || product.description,
      price: product.price,
      category: product.categoryTh || product.category,
      imageUrl: product.imageUrl,
      inStock: product.inStock
    };
  }
  return {
    id: product.productId,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    inStock: product.inStock
  };
};

/**
 * Get products by category
 * @param {string} category - Product category
 * @param {string} language - Language code (en or th)
 * @returns {Promise<Array>} - List of products in the category
 */
const getProductsByCategory = async (category, language = 'en') => {
  const filteredProducts = db.products.filter(
    product => product.category.toLowerCase() === category.toLowerCase()
  );
  if (language === 'th') {
    return filteredProducts.map(product => ({
      id: product.productId,
      name: product.nameTh || product.name,
      description: product.descriptionTh || product.description,
      price: product.price,
      category: product.categoryTh || product.category,
      imageUrl: product.imageUrl,
      inStock: product.inStock
    }));
  }
  return filteredProducts.map(product => ({
    id: product.productId,
    name: product.name,
    description: product.description,
    price: product.price,
    category: product.category,
    imageUrl: product.imageUrl,
    inStock: product.inStock
  }));
};

/**
 * Add a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} - Created product
 */
const addProduct = async (productData) => {
  const newProduct = {
    productId: productData.productId || `p${Date.now()}`,
    name: productData.name,
    nameTh: productData.nameTh || productData.name,
    description: productData.description,
    descriptionTh: productData.descriptionTh || productData.description,
    price: productData.price,
    category: productData.category,
    categoryTh: productData.categoryTh || productData.category,
    imageUrl: productData.imageUrl || '',
    inStock: productData.inStock !== undefined ? productData.inStock : true
  };
  db.products.push(newProduct);
  return newProduct;
};

/**
 * Update a product
 * @param {string} productId - Product ID
 * @param {Object} productData - Updated product data
 * @returns {Promise<Object|null>} - Updated product or null if not found
 */
const updateProduct = async (productId, productData) => {
  const productIndex = db.products.findIndex(p => p.productId === productId);
  if (productIndex === -1) return null;
  db.products[productIndex] = {
    ...db.products[productIndex],
    ...productData
  };
  return db.products[productIndex];
};

/**
 * Delete a product
 * @param {string} productId - Product ID
 * @returns {Promise<boolean>} - True if product was deleted, false otherwise
 */
const deleteProduct = async (productId) => {
  const productIndex = db.products.findIndex(p => p.productId === productId);
  if (productIndex === -1) return false;
  db.products.splice(productIndex, 1);
  return true;
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  addProduct,
  updateProduct,
  deleteProduct
};