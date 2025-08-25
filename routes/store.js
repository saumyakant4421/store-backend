
// Store routes for listing, creating, updating, and deleting stores
const express = require('express');
const router = express.Router();
const { Store, User, Rating } = require('../models');
const { roleMiddleware } = require('../middleware/role');
const { Op } = require('sequelize');
const { sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const { body, param, validationResult } = require('express-validator');

// Helper to handle validation errors in a friendly way
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // If there are validation errors, let the user know
    return res.status(400).json({ errors: errors.array() });
  }
};


// Create a new store (Admins only)
router.post(
  '/',
  roleMiddleware(['System Administrator']),
  [
    body('name').isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 characters'),
    body('email').isEmail().withMessage('Invalid email'),
    body('address').isLength({ max: 400 }).withMessage('Address must be at most 400 characters'),
    body('ownerId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ownerId must be a valid user id'),
    body('owner').optional().isObject().withMessage('owner must be an object if provided'),
    body('owner.name').optional().isString().withMessage('owner.name must be a string'),
    body('owner.email').optional().isEmail().withMessage('owner.email must be a valid email'),
    body('owner.password').optional().isLength({ min: 6 }).withMessage('owner.password must be at least 6 chars'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { name, email, address, ownerId, owner } = req.body;
    try {
      let finalOwnerId = ownerId;
      if (!finalOwnerId) {
        // If no ownerId, create a new Store Owner user if details are provided
        if (!owner || !owner.name || !owner.email || !owner.password || !owner.address) {
          return res.status(400).json({ error: 'Please provide either ownerId or all new owner details (name, email, password, address).' });
        }
        // Check if the email is already taken
        const existing = await User.findOne({ where: { email: owner.email } });
        if (existing) {
          return res.status(400).json({ error: 'A user with this email already exists.' });
        }
        // Create the new Store Owner
        const newOwner = await User.create({
          name: owner.name,
          email: owner.email,
          password: owner.password,
          address: owner.address,
          role: 'Store Owner',
        });
        finalOwnerId = newOwner.id;
      } else {
        // If ownerId is provided, make sure it references a valid Store Owner
        const ownerUser = await User.findByPk(finalOwnerId);
        if (!ownerUser || ownerUser.role !== 'Store Owner') {
          return res.status(400).json({ error: 'ownerId must reference a valid Store Owner.' });
        }
      }
      // Create the store with the correct owner
      const store = await Store.create({ name, email, address, ownerId: finalOwnerId });
      res.status(201).json(store);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);


// List all stores, with optional search and sorting
router.get('/', async (req, res) => {
  // Get search and sort params from the query string
  const { name, address, orderBy = 'name', order = 'ASC' } = req.query;
  const where = {};
  // If a name is provided, search for it (case-insensitive)
  if (name && name.trim()) where.name = { [Op.iLike]: `%${name.trim()}%` };
  // If an address is provided, search for it (case-insensitive)
  if (address && address.trim()) where.address = { [Op.iLike]: `%${address.trim()}%` };

  // Try to get the userId from the JWT if present
  const token = req.headers['authorization']?.split(' ')[1];
  let userId = null;
  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.id;
    }
  } catch (e) {
    userId = null;
  }

  // Only allow sorting by these fields
  const allowedOrderFields = ['id', 'name', 'address', 'averageRating'];
  const allowedOrderDirections = ['ASC', 'DESC'];
  const safeOrderBy = allowedOrderFields.includes(orderBy) ? orderBy : 'name';
  const safeOrder = allowedOrderDirections.includes(order?.toUpperCase()) ? order.toUpperCase() : 'ASC';

  try {
    // Add computed averageRating and userRating (if logged in) to the attributes
    const includeAttrs = [
      [
        sequelize.literal('(SELECT COALESCE(AVG("rating"),0) FROM "Ratings" WHERE "Ratings"."storeId" = "Store"."id")'),
        'averageRating',
      ],
    ];
    if (userId) {
      includeAttrs.push([
        sequelize.literal(`(SELECT "rating" FROM "Ratings" WHERE "Ratings"."storeId" = "Store"."id" AND "Ratings"."userId" = ${userId} LIMIT 1)`),
        'userRating',
      ]);
    }
    // Fetch stores with search, sorting, and computed fields
    const stores = await Store.findAll({
      where,
      attributes: { include: includeAttrs },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
      order: [
        safeOrderBy === 'averageRating'
          ? [sequelize.col('averageRating'), safeOrder]
          : [safeOrderBy, safeOrder]
      ]
    });
    res.json(stores);
  } catch (error) {
    // If something goes wrong, let the user know
    res.status(400).json({ error: error.message });
  }
});

// Get store details
router.get(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Invalid store id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { id } = req.params;
try {
const token = req.headers['authorization']?.split(' ')[1];
    let userId = null;
    try {
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
    } catch (e) {
      userId = null;
    }
    const includeAttrs = [
      [
        sequelize.literal('(SELECT COALESCE(AVG("rating"),0) FROM "Ratings" WHERE "Ratings"."storeId" = "Store"."id")'),
        'averageRating',
      ],
    ];
    if (userId) {
      includeAttrs.push([
        sequelize.literal(`(SELECT "rating" FROM "Ratings" WHERE "Ratings"."storeId" = "Store"."id" AND "Ratings"."userId" = ${userId} LIMIT 1)`),
        'userRating',
      ]);
    }
    const store = await Store.findByPk(id, {
      attributes: { include: includeAttrs },
      include: [{ model: User, as: 'User', attributes: ['id', 'name', 'email'] }],
      raw: true,
      nest: true
    });
    if (!store) return res.status(404).json({ error: 'Store not found' });
    res.json(store);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
);

// Update store (Admin only)
router.put(
  '/:id',
  roleMiddleware(['System Administrator']),
  [
    param('id').isInt({ min: 1 }).withMessage('Invalid store id'),
    body('name').optional().isLength({ min: 20, max: 60 }).withMessage('Name must be 20-60 characters'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('address').optional().isLength({ max: 400 }).withMessage('Address must be at most 400 characters'),
    body('ownerId').optional().isInt({ min: 1 }).withMessage('ownerId must be a valid user id'),
  ],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { id } = req.params;
    const updates = req.body;
    try {
      const store = await Store.findByPk(id);
      if (!store) return res.status(404).json({ error: 'Store not found' });
      if (updates.ownerId) {
        const owner = await User.findByPk(updates.ownerId);
        if (!owner || owner.role !== 'Store Owner') {
          return res.status(400).json({ error: 'ownerId must reference a valid Store Owner' });
        }
      }
      await store.update(updates);
      res.json(store);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete store (Admin only)
router.delete(
  '/:id',
  roleMiddleware(['System Administrator']),
  [param('id').isInt({ min: 1 }).withMessage('Invalid store id')],
  async (req, res) => {
    const err = handleValidation(req, res);
    if (err) return;
    const { id } = req.params;
    try {
      const store = await Store.findByPk(id);
      if (!store) return res.status(404).json({ error: 'Store not found' });
      await store.destroy();
      res.json({ message: 'Store deleted' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

module.exports = router;
