'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const passwordHash = await bcrypt.hash('SuperAdmin!2025', 10);
    return queryInterface.bulkInsert('Users', [
      {
        name: 'Super Admin',
        email: 'superadmin@example.com',
        password: passwordHash,
        address: 'Admin Address',
        role: 'System Administrator',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', { email: 'superadmin@example.com' });
  }
};
