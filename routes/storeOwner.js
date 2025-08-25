
const express = require('express');
const router = express.Router();
const { Store, Rating, User } = require('../models');
const { roleMiddleware } = require('../middleware/role');
const { sequelize } = require('../models');
const { param, validationResult } = require('express-validator');

// Get the store owned by the current user
router.get('/my-store', roleMiddleware(['Store Owner']), async (req, res) => {
  try {
    const store = await Store.findOne({ where: { ownerId: req.user.id } });
    if (!store) return res.status(404).json({ error: 'No store found for this owner' });
    res.json(store);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};

// Dashboard for store owner or admin
router.get(
  '/dashboard/:storeId',
  roleMiddleware(['Store Owner', 'System Administrator']),
  [param('storeId').isInt({ min: 1 }).withMessage('Invalid store id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { storeId } = req.params;
    try {
      const store = await Store.findByPk(storeId);
      // Only owner or admin can access
      if (!store || (req.user.role !== 'System Administrator' && store.ownerId !== req.user.id)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      const ratings = await Rating.findAll({
        where: { storeId },
        include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }]
      });
      const average = await Rating.findAll({
        where: { storeId },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'averageRating']],
        raw: true,
      });
      res.json({ ratings, average: Number(average[0].averageRating || 0) });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
