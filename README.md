# School Network Platform 🏫

A secure, hackathon-ready school communication platform with strict role-based access control, AI-moderated social feed, and centralized event management.

## 🌟 Key Features

### Security & Access Control
- **Teacher Whitelist Authentication** - Only pre-approved emails can register as teachers
- **Student Approval Workflow** - All students require teacher approval before login
- **Role-Based Authorization** - Backend-enforced on every API endpoint
- **JWT Token Authentication** - Secure session management

### Student Features
- **Personalized Dashboard** - Today's snapshot with next exam, upcoming event, latest announcement
- **School Feed** - Global social wall with post creation (text + optional image + mandatory tag)
- **AI Moderation** - Real-time sentiment analysis and toxic keyword detection on student posts
- **Read-Only Calendar** - View color-coded events (Exams, Holidays, Sports)
- **Verified Announcements** - Read school announcements with verification badges

### Teacher/Admin Features
- **Priority Dashboard** - Alerts for pending student approvals and blocked posts
- **Student Management** - Approve/reject student accounts with detailed info
- **Moderation Review Panel** - Human-in-the-loop oversight of AI-blocked posts
- **Calendar Management** - Full CRUD operations on school events
- **Announcement Creation** - Publish verified school announcements
- **Trust Signals** - Track blocked posts per student (private, teacher-only)

### AI Moderation System
- **Sentiment Analysis** - Using `sentiment` npm package
- **Toxic Keyword Detection** - Case-insensitive blacklist matching
- **Automatic Blocking** - Posts with negative sentiment or toxic words are blocked instantly
- **Silent Moderation** - User-friendly feedback: "This post looks hurtful. Please be kind."
- **Teacher Override** - Teachers can approve or permanently reject blocked posts

## 🛠️ Technology Stack

**Backend:**
- Node.js + Express
- SQL.js (for portable SQLite database)
- JWT for authentication
- bcryptjs for password hashing
- Sentiment library for AI moderation

**Frontend:**
- React 18
- Vite for build tooling
- React Router for navigation
- Ax ios for API calls
- Vanilla CSS with design system

## 📦 Installation & Setup

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Backend Setup

```bash
# Install backend dependencies
npm install

# Seed the database with demo data
npm run seed

# Start the backend server (runs on port 5000)
npm run dev
```

### Frontend Setup

```bash
# Navigate to client directory
cd client

# Install frontend dependencies
npm install

# Start the frontend dev server (runs on port 5173)
npm run dev
```

## 🔐 Demo Credentials

### Teachers
- **Email:** teacher1@school.edu | **Password:** teacher123
- **Email:** teacher2@school.edu | **Password:** teacher123

### Approved Students
- **Email:** priya@student.edu | **Password:** student123
- **Email:** rahul@student.edu | **Password:** student123

### Pending Students (Cannot log in until approved)
- **Email:** ananya@student.edu | **Password:** student123
- **Email:** karan@student.edu | **Password:** student123

## 🎯 Demo Flow

### Teacher Workflow
1. Login as `teacher1@school.edu`
2. View pending student approvals on dashboard
3. Go to Student Management → Pending tab
4. Approve pending students
5. Check AI Moderation Panel for blocked posts
6. Approve or reject flagged content
7. Manage calendar events (create/edit/delete)
8. Create school announcements

### Student Workflow
1. Login as `priya@student.edu`
2. View personalized dashboard with today's snapshot
3. Navigate to School Feed
4. Create a post (try posting toxic content to see AI moderation)
5. View calendar to see upcoming events
6. Read school announcements

### AI Moderation Test
1. Login as student
2. Try posting: "This homework is so stupid!"
3. Post will be blocked with message: "This post looks hurtful. Please be kind."
4. Login as teacher
5. View blocked post in Moderation Panel
6. Approve or reject the post

## 📁 Project Structure

```
school-network-platform/
├── server.js              # Express server entry point
├── config.js              # Configuration (whitelist, moderation settings)
├── database/
│   ├── db.js             # Database setup and helpers
│   └── seed.js           # Demo data seeding script
├── middleware/
│   └── auth.js           # JWT auth and role-based guards
├── routes/
│   ├── auth.routes.js    # Login, register, profile
│   ├── student.routes.js # Student-only endpoints
│   └── teacher.routes.js # Teacher-only endpoints
├── services/
│   └── moderation.js     # AI moderation logic
└── client/
    ├── src/
    │   ├── main.jsx      # React entry point
    │   ├── App.jsx       # Main app with routing
    │   ├── index.css     # Design system
    │   ├── api/
    │   │   └── client.js # Axios configuration
    │   ├── context/
    │   │   └── AuthContext.jsx # Auth state management
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── PostCard.jsx
    │   │   └── ProtectedRoute.jsx
    │   └── pages/
    │       ├── Login.jsx
    │       ├── student/  # Student pages
    │       └── teacher/  # Teacher pages
    └── package.json
```

## 🔒 Security Features

1. **Teacher Whitelist** - Hardcoded in `config.js`, only whitelisted emails can register as teachers
2. **No Student Self-Registration** - Students must be pre-created or invited
3. **Approval Workflow** - Students cannot log in until approved by teacher
4. **Backend Authorization** - Every endpoint checks user role and approval status
5. **JWT Tokens** - Secure, stateless authentication
6. **Password Hashing** - bcrypt with salt rounds
7. **CORS Protection** - Only configured client URL allowed

## 🎨 Design System

- **Dark Theme** - Modern dark mode with glassmorphism effects
- **Color Palette** - Carefully selected purple/blue gradients
- **Typography** - Inter font family from Google Fonts
- **Components** - Reusable card, button, badge, form components
- **Animations** - Smooth transitions and hover effects
- **Responsive** - Mobile-friendly layouts

## 📊 Data Models

### Users Table
- id, name, email, password (hashed)
- role (student | teacher)
- approval_status (pending | approved | rejected)
- class, section, roll_number, school_id (for students)
- profile_picture

### Posts Table
- id, user_id, content, image, tag
- moderation_status (pending | approved | blocked | rejected)
- moderation_reason

### Events Table
- id, title, date, type (exam | holiday | sports)
- color (red | green | blue)

### Announcements Table
- id, title, content, created_by

### Trust Signals Table
- id, user_id, blocked_posts_count

## 🚀 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (whitelist check)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Student Endpoints
- `GET /api/student/dashboard` - Dashboard snapshot
- `GET /api/student/feed` - Get approved posts
- `POST /api/student/post` - Create post (AI moderation)
- `GET /api/student/calendar` - View events
- `GET /api/student/announcements` - View announcements

### Teacher Endpoints
- `GET /api/teacher/dashboard` - Dashboard with alerts
- `GET /api/teacher/students/{status}` - List students by status
- `POST /api/teacher/students/:id/approve` - Approve student
- `POST /api/teacher/students/:id/reject` - Reject student
- `GET /api/teacher/moderation/blocked` - List blocked posts
- `POST /api/teacher/moderation/:id/approve` - Approve blocked post
- `POST /api/teacher/moderation/:id/reject` - Reject blocked post
- `GET /api/teacher/calendar` - List events
- `POST /api/teacher/calendar` - Create event
- `PUT /api/teacher/calendar/:id` - Update event
- `DELETE /api/teacher/calendar/:id` - Delete event
- `POST /api/teacher/announcements` - Create announcement
- `GET /api/teacher/trust-signals/:id` - View student trust signals

## 🧪 Testing Checklist

- [x] Teacher authentication with whitelisted email
- [x] Student approval workflow
- [x] AI moderation blocking toxic content
- [x] Teacher override of AI decisions
- [x] Calendar CRUD operations
- [x] Post creation and feed display
- [x] Role-based access control
- [x] Token expiration and auto-logout

## 📝 Notes

- Database file (`database/school.db`) is created automatically on first run
- AI moderation uses simple, explainable rules (no black-box ML)
- All moderation is client-friendly with clear user feedback
- System is hackathon-ready and demo-safe
- No external API dependencies

## 🙏 Acknowledgments

Built with clarity, security, and simplicity in mind for national-level hackathon presentation.
