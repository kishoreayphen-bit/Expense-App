# Expense App

A comprehensive expense management application with support for both personal and company expense tracking. Built with Spring Boot backend and React Native mobile frontend.

## 🚀 Features

### Personal Mode
- **Expense Tracking**: Track personal expenses with categories, receipts, and notes
- **Budget Management**: Set monthly budgets and get alerts at 80% and 90% thresholds
- **Split Bills**: Split expenses with friends using equal, custom, or percentage splits
- **Groups**: Create groups for recurring expense sharing
- **Dashboard**: Visual insights with spending charts and category breakdowns
- **Receipts**: Attach and manage bill receipts for expenses

### Company Mode
- **Multi-Company Support**: Manage expenses across multiple companies
- **Team Management**: Create teams within companies for organized expense tracking
- **Role-Based Access Control (RBAC)**: Admin, Manager, Team Lead, and Member roles
- **Reimbursement Workflow**: Submit claims and approval workflow
- **Company Budgets**: Set and track budgets at company and team levels
- **Audit Logs**: Track all actions for compliance and security
- **Member Management**: Invite members, manage roles, and permissions
- **Company Dashboard**: Comprehensive analytics for company expenses

### Additional Features
- **Payment Integration**: Stripe integration for split payments
- **Notifications**: Real-time notifications for approvals, budgets, and invitations
- **Email System**: Brevo/Sendinblue SMTP integration for email notifications
- **Multi-Currency**: Support for multiple currencies with exchange rates
- **Advanced Reports**: Generate detailed expense reports
- **ACL System**: Fine-grained access control for resources

## 🏗️ Architecture

### Backend
- **Framework**: Spring Boot 3.x (Java)
- **Database**: PostgreSQL
- **Authentication**: JWT with refresh tokens
- **Email**: Brevo SMTP
- **Payment**: Stripe API
- **Containerization**: Docker

### Mobile
- **Framework**: React Native with Expo
- **Navigation**: React Navigation
- **State Management**: React Context API
- **UI Components**: Custom components with Material Icons
- **API Client**: Axios with interceptors

## 📦 Project Structure

```
Expenses/
├── backend/                 # Spring Boot backend
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/expenseapp/
│   │   │   │   ├── acl/            # Access Control Lists
│   │   │   │   ├── auth/           # Authentication
│   │   │   │   ├── budget/         # Budget management
│   │   │   │   ├── category/       # Expense categories
│   │   │   │   ├── company/        # Company management
│   │   │   │   ├── expense/        # Expense tracking
│   │   │   │   ├── group/          # Group/Team management
│   │   │   │   ├── notification/   # Notifications
│   │   │   │   ├── payment/        # Payment processing
│   │   │   │   ├── reimbursement/  # Claims & approvals
│   │   │   │   └── user/           # User management
│   │   │   └── resources/
│   │   │       └── db/migration/   # Flyway migrations
│   │   └── test/
│   ├── Dockerfile
│   └── pom.xml
├── mobile/                  # React Native mobile app
│   ├── src/
│   │   ├── api/            # API services
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts
│   │   ├── navigation/     # Navigation setup
│   │   ├── screens/        # App screens
│   │   └── utils/          # Utility functions
│   ├── app.json
│   └── package.json
├── docker-compose.yml       # Production Docker setup
├── docker-compose.dev.yml   # Development Docker setup
└── scripts/                 # Utility scripts

```

## 🚀 Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for mobile development)
- Java 17+ (for backend development)
- Android Studio or Xcode (for mobile testing)

### Quick Start with Docker

1. **Clone the repository**
   ```bash
   git clone https://github.com/kishoreayphen-bit/Expense-App.git
   cd Expense-App
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the services**
   ```bash
   docker-compose up -d
   ```

   Services will be available at:
   - Backend API: http://localhost:18080
   - PostgreSQL: localhost:15432
   - pgAdmin: http://localhost:15050

### Mobile App Setup

1. **Navigate to mobile directory**
   ```bash
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update API base URL**
   - Edit `mobile/src/api/client.ts`
   - For Android Emulator: Use `http://10.0.2.2:18080`
   - For physical device: Use your computer's IP (e.g., `http://192.168.1.100:18080`)

4. **Start the app**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## 🔧 Configuration

### Environment Variables

Key environment variables in `.env`:

```env
# Database
POSTGRES_DB=expenseapp
POSTGRES_USER=expenseapp
POSTGRES_PASSWORD=your_password

# Backend
SPRING_PROFILES_ACTIVE=dev
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=86400000
REFRESH_TOKEN_EXPIRATION=604800000

# Email (Brevo/Sendinblue)
SPRING_MAIL_HOST=smtp-relay.brevo.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=your_email@example.com
SPRING_MAIL_PASSWORD=your_smtp_key

# Stripe
STRIPE_API_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

### Database Setup

The application uses Flyway for database migrations. Migrations are automatically applied on startup.

Default admin user:
- Email: `admin@expenseapp.com`
- Password: `admin123`

## 📱 Mobile App Features

### Screens
- **Dashboard**: Overview of expenses, budgets, and spending trends
- **Expenses**: List and manage all expenses
- **Groups/Teams**: Manage groups and team expenses
- **Splits**: Split bills with friends or team members
- **Budgets**: Set and track budgets
- **Claims**: Submit and approve reimbursement claims (company mode)
- **Notifications**: View all notifications
- **Profile**: Manage user profile and settings

### Navigation
- **Personal Mode**: Individual expense tracking
- **Company Mode**: Company expense management with teams
- **Admin Panel**: Super admin features (for SUPER_ADMIN role)

## 🔐 Authentication & Authorization

### Roles
- **SUPER_ADMIN**: System-wide administration
- **ADMIN**: Company administration
- **MANAGER**: Department/team management
- **TEAM_LEAD**: Team expense approval
- **MEMBER**: Basic user

### Permissions
- Fine-grained permissions via ACL system
- Resource-level access control
- Action-based permissions (READ, WRITE, DELETE, APPROVE)

## 🧪 Testing

### Backend Tests
```bash
cd backend
./mvnw test
```

### Test Credentials
See `RBAC_TEST_CREDENTIALS.md` for test user accounts.

## 📚 API Documentation

API endpoints are organized by domain:

- `/api/v1/auth/*` - Authentication
- `/api/v1/expenses/*` - Expense management
- `/api/v1/budgets/*` - Budget management
- `/api/v1/groups/*` - Group/Team management
- `/api/v1/companies/*` - Company management
- `/api/v1/reimbursements/*` - Claims & approvals
- `/api/v1/payments/*` - Payment processing
- `/api/v1/notifications/*` - Notifications

See `API_ENDPOINTS_REFERENCE.md` for detailed API documentation.

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up -d --build
```

## 🛠️ Development

### Backend Development
```bash
cd backend
./mvnw spring-boot:run
```

### Mobile Development
```bash
cd mobile
npm start
```

### Database Access
- **pgAdmin**: http://localhost:15050
  - Email: `admin@expenseapp.com`
  - Password: `admin`

## 📖 Documentation

Additional documentation available in the repository:

- `QUICK_START_GUIDE.md` - Quick setup guide
- `RBAC_IMPLEMENTATION_GUIDE.md` - RBAC system details
- `REIMBURSEMENT_WORKFLOW_GUIDE.md` - Claims workflow
- `PHASE2_COMPLETE_GUIDE.md` - Company features guide
- `MOBILE_UI_PERMISSIONS_GUIDE.md` - Mobile UI and permissions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is private and proprietary.

## 👥 Authors

- Kishore Ayphen

## 🙏 Acknowledgments

- Spring Boot framework
- React Native and Expo
- PostgreSQL database
- Stripe payment processing
- Brevo email service

## 📞 Support

For issues and questions, please open an issue in the GitHub repository.

---

**Note**: This is a comprehensive expense management system suitable for both personal and enterprise use. Make sure to properly configure environment variables and secure your deployment before using in production.
