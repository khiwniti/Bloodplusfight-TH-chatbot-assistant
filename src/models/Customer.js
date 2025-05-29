const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  lineUserId: {
    type: String,
    required: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true
  },
  preferences: {
    type: [String],
    default: []
  },
  purchaseHistory: [
    {
      productId: {
        type: String,
        required: true
      },
      productName: {
        type: String,
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      purchaseDate: {
        type: Date,
        default: Date.now
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Customer', CustomerSchema); 