// In-memory database for products and customers
const db = {
  products: [
    {
      id: 'p001',
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
      id: 'p002',
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
      id: 'p003',
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
      id: 'p004',
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
      id: 'p005',
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
 * @returns {Array} - List of products
 */
const getAllProducts = (language = 'en') => {
  if (language === 'th') {
    return db.products.map(product => ({
      id: product.id,
      name: product.nameTh || product.name,
      description: product.descriptionTh || product.description,
      price: product.price,
      category: product.categoryTh || product.category,
      imageUrl: product.imageUrl,
      inStock: product.inStock
    }));
  }
  
  return db.products;
};

/**
 * Get product by ID
 * @param {string} productId - Product ID
 * @param {string} language - Language code (en or th)
 * @returns {Object|null} - Product object or null if not found
 */
const getProductById = (productId, language = 'en') => {
  const product = db.products.find(p => p.id === productId);
  
  if (!product) return null;
  
  if (language === 'th') {
    return {
      id: product.id,
      name: product.nameTh || product.name,
      description: product.descriptionTh || product.description,
      price: product.price,
      category: product.categoryTh || product.category,
      imageUrl: product.imageUrl,
      inStock: product.inStock
    };
  }
  
  return product;
};

/**
 * Get products by category
 */
const getProductsByCategory = (category) => {
  return db.products.filter(product => product.category.toLowerCase() === category.toLowerCase());
};

/**
 * Find or create a customer
 * @param {string} userId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Object} - Customer object
 */
const findOrCreateCustomer = (userId, displayName = 'Customer') => {
  if (!db.customers[userId]) {
    // Create new customer if not exists
    db.customers[userId] = {
      userId,
      displayName,
      createdAt: new Date().toISOString(),
      preferences: [],
      lastActivity: new Date().toISOString()
    };
    
    // Initialize empty purchase history
    db.purchases[userId] = [];
  } else {
    // Update last activity
    db.customers[userId].lastActivity = new Date().toISOString();
  }
  
  return db.customers[userId];
};

/**
 * Get customer by ID
 * @param {string} userId - Customer ID
 * @returns {Object|null} - Customer object or null if not found
 */
const getCustomerById = (userId) => {
  return db.customers[userId] || null;
};

/**
 * Update customer preferences
 * @param {string} userId - LINE user ID
 * @param {Array} preferences - Array of preference strings
 * @returns {Object} - Updated customer object
 */
const updateCustomerPreferences = (userId, preferences) => {
  if (!db.customers[userId]) {
    throw new Error('Customer not found');
  }
  
  db.customers[userId].preferences = preferences;
  return db.customers[userId];
};

/**
 * Add a purchase to customer history
 * @param {string} userId - LINE user ID
 * @param {string} productId - Product ID
 * @returns {Object} - Purchase record
 */
const addPurchase = (userId, productId) => {
  const product = getProductById(productId);
  
  if (!product) {
    throw new Error('Product not found');
  }
  
  if (!db.customers[userId]) {
    throw new Error('Customer not found');
  }
  
  const purchase = {
    id: `pur_${Date.now()}`,
    userId,
    productId,
    productName: product.name,
    price: product.price,
    purchaseDate: new Date().toISOString()
  };
  
  if (!db.purchases[userId]) {
    db.purchases[userId] = [];
  }
  
  db.purchases[userId].push(purchase);
  
  return purchase;
};

/**
 * Get purchase history for a customer
 * @param {string} userId - LINE user ID
 * @param {string} language - Language code (en or th)
 * @returns {Array} - List of purchase records
 */
const getPurchaseHistory = (userId, language = 'en') => {
  if (!db.purchases[userId]) {
    return [];
  }
  
  if (language === 'th') {
    return db.purchases[userId].map(purchase => {
      const product = db.products.find(p => p.id === purchase.productId);
      if (product && product.nameTh) {
        return {
          ...purchase,
          productName: product.nameTh
        };
      }
      return purchase;
    });
  }
  
  return db.purchases[userId];
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductsByCategory,
  findOrCreateCustomer,
  getCustomerById,
  updateCustomerPreferences,
  addPurchase,
  getPurchaseHistory
}; 