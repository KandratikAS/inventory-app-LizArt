const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { createAccountWithContact } = require('../services/salesforce');

router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone, company } = req.body;
    if (!firstName || !lastName) return res.status(400).json({ error: 'First and last name required' });

    const result = await createAccountWithContact({
      firstName,
      lastName,
      email: req.user.email,
      phone,
      company,
    });

    res.json({ success: true, ...result });
  } catch (e) {
    console.error('Salesforce error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;