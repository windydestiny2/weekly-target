# TODO: Add Authentication and New Pages

## Database
- [x] Add users table to learningweeklytarget.sql
- [x] Import updated SQL to MySQL

## Backend
- [x] Add bcrypt and express-session to package.json
- [x] Install new dependencies
- [x] Create backend/models/userModel.js
- [x] Create backend/controllers/authController.js
- [x] Create backend/routes/authRoutes.js
- [x] Update backend/server.js to include auth routes and session
- [x] Migrate all routes to Express

## Frontend
- [x] Create frontend/login.html
- [x] Create frontend/register.html
- [x] Create frontend/index.html (landing)
- [x] Modify frontend/dashboard.html (add check-in button, logout)
- [x] Update frontend/dashboard.js (add check-in functionality, logout)
- [x] Update frontend/script.js (use user_id from localStorage)

## Testing
- [x] Server running on port 5001
- [x] Frontend opened in browser
- [ ] Test registration, login, logout
- [ ] Test navigation between pages
- [ ] Test check-in feature
