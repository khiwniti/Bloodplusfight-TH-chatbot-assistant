const Customer = require('../models/Customer');

/**
 * Find customer by Line user ID or create if not exists
 */
const findOrCreateCustomer = async (lineUserId, displayName) => {
  try {
    let customer = await Customer.findOne({ lineUserId });

    if (!customer) {
      customer = new Customer({
        lineUserId,
        displayName
      });
      await customer.save();
    }
    
    return customer;
  } catch (error) {
    console.error('Error in findOrCreateCustomer:', error);
    throw error;
  }
};

/**
 * Update customer preferences
 */
const updatePreferences = async (lineUserId, preferences) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { lineUserId },
      { preferences },
      { new: true }
    );
    return customer;
  } catch (error) {
    console.error('Error in updatePreferences:', error);
    throw error;
  }
};

/**
 * Add a purchase to customer history
 */
const addPurchase = async (lineUserId, purchase) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { lineUserId },
      { $push: { purchaseHistory: purchase } },
      { new: true }
    );
    return customer;
  } catch (error) {
    console.error('Error in addPurchase:', error);
    throw error;
  }
};

/**
 * Get customer purchase history
 */
const getPurchaseHistory = async (lineUserId) => {
  try {
    const customer = await Customer.findOne({ lineUserId });
    return customer ? customer.purchaseHistory : [];
  } catch (error) {
    console.error('Error in getPurchaseHistory:', error);
    throw error;
  }
};

module.exports = {
  findOrCreateCustomer,
  updatePreferences,
  addPurchase,
  getPurchaseHistory
}; 