# Store Rating App Backend

This is the backend for the **Store Rating App**, providing API for user authentication, store management, ratings, and admin operations.

## Tech Stack

- **Node.js** (Express.js framework)
- **Sequelize** (ORM for PostgreSQL)
- **PostgreSQL** (hosted on Neon)
- **JWT** (authentication)
- **bcryptjs** (password hashing)
- **dotenv** (environment variables)
- **CORS** (cross-origin requests)
- **Render** (deployment)

## Features
- User registration and login (JWT-based)
- Store CRUD operations
- Star rating system
- Admin and store owner roles
- Input validation (name, address, password, email)
- Secure password storage
- CORS enabled for frontend integration
- Seeders for admin creation


## Development

1. Clone the repo
2. Run `npm install`
3. Set up your `.env` file
4. Run migrations: `npx sequelize-cli db:migrate`
5. (Optional) Seed admin: `npx sequelize-cli db:seed:all`
6. Start server: `npm run dev` (default: http://localhost:5000)

## Production Deployment

- Deploy to [Render](https://render.com/) or any Node.js hosting provider.
- Ensure environment variables are set in the deployment dashboard.

## API Endpoints

- All endpoints are prefixed with `/api`.
- See route files in `/routes` for details.

## Notes

- CORS is configured to allow all origins for easy frontend integration.
- For production, restrict CORS as needed.
- The backend may take a few seconds to respond after periods of inactivity (cold start on free hosting).

---

**Frontend:** [See frontend repo or https://store-frontend-gamma-five.vercel.app/ for the UI.]
