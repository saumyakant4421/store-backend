'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {

    static associate(models) {
      // User has many Stores (ownerId)
      User.hasMany(models.Store, { foreignKey: 'ownerId', as: 'Stores' });
    }
  }
  const bcrypt = require('bcryptjs');
  User.init({
    name: {
      type: DataTypes.STRING,
      validate: {
        len: {
          args: [10, 40],
          msg: 'Name must be between 10 and 40 characters.'
        }
      }
    },
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    address: DataTypes.STRING,
    role: DataTypes.ENUM('System Administrator', 'Normal User', 'Store Owner')
  }, {
    sequelize,
    modelName: 'User',
    hooks: {
      beforeCreate: async (user, options) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user, options) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  return User;
};