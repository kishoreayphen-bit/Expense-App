# ExpenseApp Mobile (React Native + Expo)

This is a React Native (Expo) client for the ExpenseApp backend. It supports login, dashboard, expenses, budgets (base-normalized), FX tools, splits simulator, ACL management, audit logs, and app settings.

## Requirements
- Node.js 18+
- npm or yarn
- Expo CLI (installed via `npx expo` automatically)
- iOS/Android emulator or Expo Go app on a physical device

## Setup
1. Navigate to the mobile app directory:
   ```bash
   cd mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Metro bundler:
   ```bash
   npm run start
   ```
4. Run on device/emulator:
   - Android: `npm run android`
   - iOS: `npm run ios`
   - Web: `npm run web` (limited features)

## Backend URL
- On the Login screen, set the Backend URL to your running backend.
  - Example for emulator: `http://10.0.2.2:8080` (Android), `http://localhost:8080` (iOS simulator)
  - Example for device on same LAN: `http://<your-computer-ip>:8080`
- The app stores the value in SecureStore and applies it to all API calls.

## Auth expectations
- The app posts to `POST /api/v1/auth/login` with `{ email, password }` and expects `{ accessToken }` or `{ token }` in the response.
- The token is attached to subsequent requests as `Authorization: Bearer <token>`.

## Screens and API usage
- Dashboard (`src/screens/DashboardScreen.tsx`)
  - `GET /api/v1/dashboard/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&base=true|false`
- Expenses (`src/screens/ExpensesScreen.tsx`)
  - `GET /api/v1/expenses?from&to`
  - `GET /api/v1/expenses/{id}`
  - `DELETE /api/v1/expenses/{id}`
- Budgets (`src/screens/BudgetsScreen.tsx`)
  - `GET /api/v1/budgets/anomalies?period=YYYY-MM&base=true`
  - `GET /api/v1/budgets/predicted?period=YYYY-MM&base=true`
  - `GET /api/v1/budgets/variance?period=YYYY-MM&base=true`
- FX (`src/screens/FXScreen.tsx`)
  - `GET /api/v1/fx/convert?date=YYYY-MM-DD&currency=USD&amount=100`
  - `GET /api/v1/fx/rates/history?currency=USD&from=YYYY-MM-DD&to=YYYY-MM-DD`
- Splits (`src/screens/SplitsScreen.tsx`)
  - `POST /api/v1/split/simulate` with body `{ type, totalAmount, currency, occurredOn, participants:[{userId, ratio}] }`
- ACL (`src/screens/ACLScreen.tsx`)
  - `GET /api/v1/acl/list?resourceType&resourceId`
  - `POST /api/v1/acl/share`
  - `DELETE /api/v1/acl/share` (with body)
- Audit (`src/screens/AuditLogsScreen.tsx`)
  - `GET /api/v1/audit/logs?from&to&actorId&action&resourceType&resourceId&outcome&offset&limit`
  - Non-admins only see their own logs; admins see all
- Settings (`src/screens/SettingsScreen.tsx`)
  - Backend URL and Logout

## Notes
- Some endpoints assume existing backend entities and auth configuration (JWT).
- If your backend uses a different login route/shape, adjust `AuthContext.login()` accordingly.
- For Android emulator use `10.0.2.2` instead of `localhost` when connecting to a backend running on your computer.

## Project structure
- `App.tsx`: App bootstrap
- `src/navigation/`: React Navigation setup
- `src/context/AuthContext.tsx`: Auth state and Axios config
- `src/screens/`: Feature screens
- `src/api/`: Axios helpers
- `src/config.ts`: Default backend URL

## Troubleshooting
- If API calls fail on device, verify:
  - Your device and computer are on the same network
  - Use IP address instead of `localhost`
  - Backend CORS is configured to allow mobile origin
- If login fails, ensure the backend login route returns `{ accessToken }` or `{ token }`.
