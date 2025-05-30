const Customer = require('../models/Customer');
const mongoose = require('mongoose');

// In-memory customer storage for when database is not available
const inMemoryCustomers = new Map();

// Timeout for MongoDB operations in milliseconds
const MONGODB_OPERATION_TIMEOUT = 5000;

/**
 * Check if MongoDB is connected
 * @returns {boolean} Connection status
 */
const isMongoDBConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Execute MongoDB operation with timeout protection
 * @param {Function} operation - MongoDB operation to execute
 * @param {Function} fallback - Fallback function if operation fails
 * @returns {Promise<any>} Operation result or fallback result
 */
const executeWithTimeout = async (operation, fallback) => {
  if (!isMongoDBConnected()) {
    console.log('MongoDB not connected, using fallback');
    return fallback();
  }

  try {
    // Create a timeout promise that rejects after specified time
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('MongoDB operation timed out')), MONGODB_OPERATION_TIMEOUT);
    });

    // Race the operation against the timeout
    return await Promise.race([operation(), timeoutPromise]);
  } catch (error) {
    console.error('MongoDB operation failed:', error.message);
    return fallback();
  }
};

/**
 * Find customer by Line user ID or create if not exists
 * @param {string} lineUserId - LINE user ID
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} Customer data
 */
const getOrCreateCustomer = async (lineUserId, displayName) => {
  try {
    return await executeWithTimeout(
      async () => {
        let customer = await Customer.findOne({ lineUserId }).exec();

        if (!customer) {
          customer = new Customer({
            lineUserId,
            displayName,
            preferences: [],
            purchaseHistory: []
          });
          await customer.save();
        }
        
        return customer;
      },
      () => getOrCreateInMemoryCustomer(lineUserId, displayName)
    );
  } catch (error) {
    console.error('Error in getOrCreateCustomer:', error);
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
    return await executeWithTimeout(
      async () => {
        const customer = await Customer.findOneAndUpdate(
          { lineUserId },
          { $set: { preferences } },
          { new: true }
        ).exec();
        
        if (!customer) {
          throw new Error('Customer not found');
        }
        
        return customer;
      },
      () => updateInMemoryCustomerPreferences(lineUserId, preferences)
    );
  } catch (error) {
    console.error('Error in updatePreferences:', error);
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
    return await executeWithTimeout(
      async () => {
        const customer = await Customer.findOneAndUpdate(
          { lineUserId },
          { $push: { purchaseHistory: purchase } },
          { new: true }
        ).exec();
        
        if (!customer) {
          throw new Error('Customer not found');
        }
        
        return customer;
      },
      () => addInMemoryPurchase(lineUserId, purchase)
    );
  } catch (error) {
    console.error('Error in addPurchase:', error);
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
    return await executeWithTimeout(
      async () => {
        const customer = await Customer.findOne({ lineUserId }).exec();
        return customer ? customer.purchaseHistory : [];
      },
      () => {
        const customer = getOrCreateInMemoryCustomer(lineUserId);
        return customer.purchaseHistory || [];
      }
    );
  } catch (error) {
    console.error('Error in getPurchaseHistory:', error);
    return [];
  }
};

module.exports = {
  getOrCreateCustomer,
  updatePreferences,
  addPurchase,
  getPurchaseHistory
};