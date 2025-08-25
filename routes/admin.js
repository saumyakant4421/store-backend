
const express = require('express');
const router = express.Router();
const { User, Store, Rating } = require('../models');
const { roleMiddleware } = require('../middleware/role');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { body, param, validationResult } = require('express-validator');
const { sequelize } = require('../models');

const passwordRegex = /^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,16}$/;
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
};


router.get('/dashboard', roleMiddleware(['System Administrator']), async (req, res) => {
  try {
    const [usersCount, storesCount, ratingsCount] = await Promise.all([
      User.count(),
      Store.count(),
      Rating.count(),
    ]);
    res.json({ usersCount, storesCount, ratingsCount });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.get('/users', roleMiddleware(['System Administrator']), async (req, res) => {
  const { name, email, address, role, orderBy = 'name', order = 'ASC' } = req.query;
  const where = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (email) where.email = { [Op.iLike]: `%${email}%` };
  if (address) where.address = { [Op.iLike]: `%${address}%` };
  if (role) where.role = role;
  const allowedOrderFields = ['id', 'name', 'email', 'address', 'role'];
  const allowedOrderDirections = ['ASC', 'DESC'];
  const safeOrderBy = allowedOrderFields.includes(orderBy) ? orderBy : 'name';
  const safeOrder = allowedOrderDirections.includes(order?.toUpperCase()) ? order.toUpperCase() : 'ASC';
  try {
    const users = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'address', 'role'],
      order: [[safeOrderBy, safeOrder]],
      raw: true,
    });
    const storeOwnerIds = users.filter(u => u.role === 'Store Owner').map(u => u.id);
    let ownerRatings = {};
    if (storeOwnerIds.length) {
      const [results] = await sequelize.query(`
        SELECT u.id AS "ownerId", COALESCE(AVG(r."rating"), 0) AS "averageRating"
        FROM "Users" u
        LEFT JOIN "Stores" s ON s."ownerId" = u.id
        LEFT JOIN "Ratings" r ON r."storeId" = s.id
        WHERE u.id IN (:ids)
        GROUP BY u.id
      `, {
        replacements: { ids: storeOwnerIds },
        type: sequelize.QueryTypes.SELECT
      });
      if (Array.isArray(results)) {
        results.forEach(r => {
          ownerRatings[r.ownerId] = Number(r.averageRating);
        });
      } else if (results && results.ownerId) {
        ownerRatings[results.ownerId] = Number(results.averageRating);
      }
    }
    const usersWithRatings = users.map(u =>
      u.role === 'Store Owner' ? { ...u, averageRating: ownerRatings[u.id] ?? 0 } : u
    );
    res.json(usersWithRatings);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.get('/stores', roleMiddleware(['System Administrator']), async (req, res) => {
  const { name, email, address, orderBy = 'name', order = 'ASC' } = req.query;
  const where = {};
  if (name) where.name = { [Op.iLike]: `%${name}%` };
  if (email) where.email = { [Op.iLike]: `%${email}%` };
  if (address) where.address = { [Op.iLike]: `%${address}%` };
  const allowedOrderFields = ['id', 'name', 'email', 'address', 'averageRating'];
  const allowedOrderDirections = ['ASC', 'DESC'];
  const safeOrderBy = allowedOrderFields.includes(orderBy) ? orderBy : 'name';
  const safeOrder = allowedOrderDirections.includes(order?.toUpperCase()) ? order.toUpperCase() : 'ASC';
  try {
    const stores = await Store.findAll({
      where,
      attributes: {
        include: [
          [
            sequelize.literal('(SELECT COALESCE(AVG("rating"),0) FROM "Ratings" WHERE "Ratings"."storeId" = "Store"."id")'),
            'averageRating',
          ],
        ],
      },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
      order: [
        safeOrderBy === 'averageRating'
          ? [sequelize.literal('averageRating'), safeOrder]
          : [safeOrderBy, safeOrder]
      ],
    });
    res.json(stores);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


router.post(
  '/users',
  roleMiddleware(['System Administrator']),
  [
    body('name').isLength({ min: 10, max: 40 }).withMessage('Name must be 10-40 characters'),
    body('email').isEmail().withMessage('Invalid email'),
    body('address').isLength({ max: 400 }).withMessage('Address must be at most 400 characters'),
    body('password')
      .matches(passwordRegex)
      .withMessage('Password must be 8-16 chars and include at least one uppercase letter and one special character'),
    body('role').isIn(['System Administrator', 'Normal User', 'Store Owner']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { name, email, password, address, role } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ name, email, password: hashedPassword, address, role });
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


router.get(
  '/users/:id',
  roleMiddleware(['System Administrator']),
  [param('id').isInt({ min: 1 }).withMessage('Invalid user id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { id } = req.params;
    try {
      const user = await User.findByPk(id, { attributes: ['id', 'name', 'email', 'address', 'role'] });
      if (!user) return res.status(404).json({ error: 'User not found' });
      if (user.role === 'Store Owner') {
        const stores = await Store.findAll({ where: { ownerId: user.id }, attributes: ['id'], raw: true });
        const storeIds = stores.map((s) => s.id);
        let storeRating = 0;
        if (storeIds.length) {
          const avg = await Rating.findOne({
            where: { storeId: { [Op.in]: storeIds } },
            attributes: [[Rating.sequelize.fn('AVG', Rating.sequelize.col('rating')), 'averageRating']],
            raw: true,
          });
          storeRating = Number(avg?.averageRating || 0);
        }
        return res.json({ ...user.toJSON(), storeRating });
      }
      return res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
