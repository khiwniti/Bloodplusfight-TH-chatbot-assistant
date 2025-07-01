// In-memory customer storage for when database is not available
const inMemoryCustomers = new Map();

/**
 * Find customer by Line user ID or create if not exists
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} Customer data
 */
const getOrCreateCustomer = async (lineUserId, displayName) => {
  try {
    return getOrCreateInMemoryCustomer(lineUserId, displayName);
  } catch (error) {
    // Always return a valid customer object, even if just a minimal one
    return {
      lineUserId,
      displayName: displayName || 'Customer',
      preferences: [],
      purchaseHistory: []
    };
  }
};

/**
 * Get or create customer in memory
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Object} Customer data
 */
const getOrCreateInMemoryCustomer = (lineUserId, displayName) => {
  if (!inMemoryCustomers.has(lineUserId)) {
    inMemoryCustomers.set(lineUserId, {
      lineUserId,
      displayName: displayName || 'Customer',
      preferences: [],
      purchaseHistory: [],
      createdAt: new Date()
    });
  }
  return inMemoryCustomers.get(lineUserId);
};

/**
 * Update customer preferences
 * @param {string} lineUserId - LINE user ID
 * @param {Array<string>} preferences - Array of preferences
 * @returns {Promise<Object>} Updated customer data
 */
const updatePreferences = async (lineUserId, preferences) => {
  try {
    return updateInMemoryCustomerPreferences(lineUserId, preferences);
  } catch (error) {
    return updateInMemoryCustomerPreferences(lineUserId, preferences);
  }
};

/**
 * Update in-memory customer preferences
 * @param {string} lineUserId - LINE user ID
 * @param {Array<string>} preferences - Array of preferences
 * @returns {Object} Updated customer data
 */
const updateInMemoryCustomerPreferences = (lineUserId, preferences) => {
  const customer = getOrCreateInMemoryCustomer(lineUserId);
  customer.preferences = preferences;
  return customer;
};

/**
 * Add a purchase to customer history
 * @param {string} lineUserId - LINE user ID
 * @param {Object} purchase - Purchase data
 * @returns {Promise<Object>} Updated customer data
 */
const addPurchase = async (lineUserId, purchase) => {
  try {
    return addInMemoryPurchase(lineUserId, purchase);
  } catch (error) {
    return addInMemoryPurchase(lineUserId, purchase);
  }
};

/**
 * Add purchase to in-memory customer
 * @param {string} lineUserId - LINE user ID
 * @param {Object} purchase - Purchase data
 * @returns {Object} Updated customer data
 */
const addInMemoryPurchase = (lineUserId, purchase) => {
  const customer = getOrCreateInMemoryCustomer(lineUserId);
  if (!customer.purchaseHistory) {
    customer.purchaseHistory = [];
  }
  customer.purchaseHistory.push({
    ...purchase,
    purchaseDate: new Date()
  });
  return customer;
};

/**
 * Get customer purchase history
 * @param {string} lineUserId - LINE user ID
 * @returns {Promise<Array>} Purchase history
 */
const getPurchaseHistory = async (lineUserId) => {
  try {
    const customer = inMemoryCustomers.get(lineUserId);
    if (!customer) {return [];}
    return customer.purchaseHistory || [];
  } catch (error) {
    return [];
  }
};

module.exports = {
  getOrCreateCustomer,
  updatePreferences,
  addPurchase,
  getPurchaseHistory
};