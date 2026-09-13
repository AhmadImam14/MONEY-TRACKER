const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    personId: { type: mongoose.Schema.Types.ObjectId, ref: 'Person', required: true, index: true },
    reference: { type: String, required: true, unique: true },
    type: { type: String, enum: ['received', 'returned'], required: true },
    // amount stored in kobo (integer)
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, default: '' },
    // date of the transaction (user-specified)
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

transactionSchema.index({ personId: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
