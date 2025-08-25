
const express = require('express');
const router = express.Router();
const { Rating, Store } = require('../models');
const authMiddleware = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/role');
const { sequelize } = require('../models');
const { body, param, validationResult } = require('express-validator');

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};


router.post(
  '/',
  roleMiddleware(['Normal User']),
  [
    body('storeId').isInt({ min: 1 }).withMessage('storeId must be a valid integer'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be an integer between 1 and 5'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { storeId, rating } = req.body;
    try {
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Store not found' });
      const [ratingRecord, created] = await Rating.findOrCreate({
        where: { userId: req.user.id, storeId },
        defaults: { rating },
      });
      if (!created) await ratingRecord.update({ rating });
      res.status(201).json({ message: 'Rating saved', rating });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.get(
  '/user/:storeId',
  authMiddleware,
  [param('storeId').isInt({ min: 1 }).withMessage('Invalid store id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { storeId } = req.params;
    try {
      const rating = await Rating.findOne({ where: { userId: req.user.id, storeId } });
      res.json({ rating: rating ? rating.rating : null });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.get(
  '/average/:storeId',
  [param('storeId').isInt({ min: 1 }).withMessage('Invalid store id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { storeId } = req.params;
    try {
      const average = await Rating.findAll({
        where: { storeId },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'averageRating']],
        raw: true,
      });
      res.json({ average: Number(average[0].averageRating || 0) });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


module.exports = router;
