require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');
const { User, Store, Rating } = require('./models');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const storeRoutes = require('./routes/store');
const ratingRoutes = require('./routes/rating');
const storeOwnerRoutes = require('./routes/storeOwner');

const app = express();

app.use(
  cors({
    origin: true, 
    credentials: true,
  })
);
  
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Store Rating API');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/store-owner', storeOwnerRoutes);

const PORT = process.env.PORT || 5000;
db.sequelize
  .sync({ force: false })
  .then(() => {
    console.log('Database and tables synced');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to sync database:', err);
  });
