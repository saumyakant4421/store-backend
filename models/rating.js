'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Rating extends Model {
    static associate(models) {
      // Rating belongs to User and Store
      Rating.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
      Rating.belongsTo(models.Store, { foreignKey: 'storeId', as: 'Store' });
    }
  }
  Rating.init({
    rating: { type: DataTypes.INTEGER, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    storeId: { type: DataTypes.INTEGER, allowNull: false }
  }, {
    sequelize,
    modelName: 'Rating',
  });
  return Rating;
};
