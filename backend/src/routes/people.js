const express = require('express');
const router = express.Router();
const Person = require('../models/person');
const Transaction = require('../models/transaction');

// Create person
router.post('/', async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    const person = new Person({ name: name.trim(), phone, email });
    await person.save();
    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
});

// List people
router.get('/', async (req, res, next) => {
  try {
    const people = await Person.find().sort({ createdAt: -1 });
    res.json(people);
  } catch (err) {
    next(err);
  }
});

// Get person
router.get('/:id', async (req, res, next) => {
  try {
    const person = await Person.findById(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch (err) {
    next(err);
  }
});

// Get financial summary for a person
router.get('/:id/summary', async (req, res, next) => {
  try {
    const personId = req.params.id;
    const person = await Person.findById(personId);
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const agg = await Transaction.aggregate([
      { $match: { personId: person._id } },
      {
        $group: {
          _id: '$personId',
          totalReceived: { $sum: { $cond: [{ $eq: ['$type', 'received'] }, '$amount', 0] } },
          totalReturned: { $sum: { $cond: [{ $eq: ['$type', 'returned'] }, '$amount', 0] } },
          count: { $sum: 1 },
        },
      },
    ]);

    const totals = agg[0] || { totalReceived: 0, totalReturned: 0, count: 0 };
    const balance = (totals.totalReceived || 0) - (totals.totalReturned || 0);

    // return amounts in kobo (integer) and formatted naira strings
    function fmt(kobo) {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format((kobo || 0) / 100);
    }

    res.json({
      personId,
      totalReceived: totals.totalReceived || 0,
      totalReturned: totals.totalReturned || 0,
      balance,
      transactions: totals.count || 0,
      formatted: { totalReceived: fmt(totals.totalReceived), totalReturned: fmt(totals.totalReturned), balance: fmt(balance) },
    });
  } catch (err) {
    next(err);
  }
});

// Update person
router.put('/:id', async (req, res, next) => {
  try {
    const { name, phone, email } = req.body;
    const person = await Person.findByIdAndUpdate(
      req.params.id,
      { name, phone, email },
      { new: true, runValidators: true }
    );
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch (err) {
    next(err);
  }
});

// Delete person
router.delete('/:id', async (req, res, next) => {
  try {
    const person = await Person.findByIdAndDelete(req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
