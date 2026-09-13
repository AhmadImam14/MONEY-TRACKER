const express = require('express');
const router = express.Router();
const Transaction = require('../models/transaction');
const Person = require('../models/person');

function parseAmountToKobo(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  // store as integer kobo
  return Math.round(n * 100);
}

function makeReference() {
  const d = new Date();
  const yyyy = d.getFullYear().toString();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `TXN-${yyyy}${mm}${dd}-${rand}`;
}

// Create transaction for a person
router.post('/people/:id/transactions', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const person = await Person.findById(personId);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const { type, amount, description, date } = req.body;
    if (!type || !['received', 'returned'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }
    const kobo = parseAmountToKobo(amount);
    if (kobo === null || kobo <= 0) {
      return res.status(400).json({ error: 'Amount must be a number greater than zero' });
    }
    if (!date) return res.status(400).json({ error: 'Date is required' });

    // For returned transactions, ensure not exceeding current balance
    if (type === 'returned') {
      const agg = await Transaction.aggregate([
        { $match: { personId: person._id } },
        {
          $group: {
            _id: null,
            received: { $sum: { $cond: [{ $eq: ['$type', 'received'] }, '$amount', 0] } },
            returned: { $sum: { $cond: [{ $eq: ['$type', 'returned'] }, '$amount', 0] } },
          },
        },
      ]);
      const totals = agg[0] || { received: 0, returned: 0 };
      const balance = (totals.received || 0) - (totals.returned || 0);
      if (kobo > balance) {
        return res.status(400).json({ error: 'Return amount exceeds current balance' });
      }
    }

    // generate unique reference (retry on collision a few times)
    let reference = makeReference();
    for (let i = 0; i < 5; i++) {
      // ensure uniqueness
      // eslint-disable-next-line no-await-in-loop
      const exists = await Transaction.findOne({ reference });
      if (!exists) break;
      reference = makeReference();
    }

    const txn = new Transaction({ personId, reference, type, amount: kobo, description: description || '', date: new Date(date) });
    await txn.save();
    res.status(201).json(txn);
  } catch (err) {
    // handle duplicate reference edge-case
    if (err.code === 11000 && err.keyPattern && err.keyPattern.reference) {
      return res.status(500).json({ error: 'Reference generation collision, try again' });
    }
    next(err);
  }
});

// List transactions for a person (with optional filters)
router.get('/people/:id/transactions', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const { type, q, from, to, sort = 'desc' } = req.query;
    const filter = { personId };
    if (type && ['received', 'returned'].includes(type)) filter.type = type;
    if (q) filter.$or = [{ description: { $regex: q, $options: 'i' } }, { reference: { $regex: q, $options: 'i' } }];
    if (from || to) filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);

    const txns = await Transaction.find(filter).sort({ date: sort === 'asc' ? 1 : -1, createdAt: -1 });
    res.json(txns);
  } catch (err) {
    next(err);
  }
});

// Get single transaction
router.get('/:id', async (req, res, next) => {
  try {
    const txn = await Transaction.findById(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json(txn);
  } catch (err) {
    next(err);
  }
});

// Edit transaction
router.put('/:id', async (req, res, next) => {
  try {
    const { type, amount, description, date } = req.body;
    const updates = {};
    if (type) {
      if (!['received', 'returned'].includes(type)) return res.status(400).json({ error: 'Invalid type' });
      updates.type = type;
    }
    if (amount !== undefined) {
      const kobo = parseAmountToKobo(amount);
      if (kobo === null || kobo <= 0) return res.status(400).json({ error: 'Invalid amount' });
      updates.amount = kobo;
    }
    if (description !== undefined) updates.description = description;
    if (date) updates.date = new Date(date);

    const txn = await Transaction.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json(txn);
  } catch (err) {
    next(err);
  }
});

// Delete transaction
router.delete('/:id', async (req, res, next) => {
  try {
    const txn = await Transaction.findByIdAndDelete(req.params.id);
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
