'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Store extends Model {

    static associate(models) {
      // Store belongs to User (ownerId)
      Store.belongsTo(models.User, { foreignKey: 'ownerId', as: 'User' });
      // Store has many Ratings
      Store.hasMany(models.Rating, { foreignKey: 'storeId', as: 'Ratings' });
    }
  }
  Store.init({
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    address: DataTypes.STRING,
    ownerId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Store',
  });
  return Store;
};
