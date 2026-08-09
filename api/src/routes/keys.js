const express = require('express');
const { authenticateMerchant } = require('../middleware/auth');
const KeyService = require('../services/keyService');
const { BadRequestError } = require('../utils/errors');

const router = express.Router();

router.use(authenticateMerchant);

// Create API Key
router.post('/', async (req, res, next) => {
  try {
    const { mode, name } = req.body;
    const keyMode = mode === 'live' ? 'live' : 'test';
    const keyName = name || (keyMode === 'live' ? 'Secret Live Key' : 'Secret Test Key');

    const key = await KeyService.createKey(req.merchant.id, keyMode, keyName);

    res.status(201).json({
      message: 'API Key generated successfully. Make sure to copy it now, it will not be shown again.',
      key,
    });
  } catch (err) {
    next(err);
  }
});

// List API Keys
router.get('/', async (req, res, next) => {
  try {
    const keys = await KeyService.listKeys(req.merchant.id);
    res.json({ keys });
  } catch (err) {
    next(err);
  }
});

// Revoke API Key
router.delete('/:id', async (req, res, next) => {
  try {
    await KeyService.revokeKey(req.merchant.id, req.params.id);
    res.json({ message: 'API Key revoked successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
