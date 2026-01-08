# School Feed Post Creation - Technical Flow

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE (REACT)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
              [STUDENT]                          [TEACHER]
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐          ┌──────────────────────┐
        │  Feed.jsx (Student)  │          │  Feed.jsx (Teacher)  │
        └──────────────────────┘          └──────────────────────┘
                    │                                 │
                    │  1. User enters text            │
                    │  2. Selects category tag        │
                    │  3. (Optional) Uploads image    │
                    │     - File picker (.jpg/.jpeg/.png)
                    │     - Client validates type/size
                    │     - Preview generated         │
                    │  4. Clicks "Publish Post"       │
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────────────────────────────────────┐
        │        FormData (multipart/form-data)                │
        │  - content: "Post text..."                           │
        │  - tag: "#Academics"                                 │
        │  - image: File object (if uploaded)                  │
        └──────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API CLIENT (AXIOS)                                    │
│  POST /api/student/post  OR  POST /api/teacher/post                         │
│  Headers: { Content-Type: 'multipart/form-data' }                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (EXPRESS)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
              [STUDENT ROUTE]                   [TEACHER ROUTE]
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐          ┌──────────────────────┐
        │  Multer Middleware   │          │  Multer Middleware   │
        │  - Validate MIME     │          │  - Validate MIME     │
        │  - Check size (5MB)  │          │  - Check size (5MB)  │
        │  - Store in /uploads │          │  - Store in /uploads │
        │  - Unique filename   │          │  - Unique filename   │
        └──────────────────────┘          └──────────────────────┘
                    │                                 │
                    ▼                                 ▼
        ┌──────────────────────┐          ┌──────────────────────┐
        │   Validate Input     │          │   Validate Input     │
        │   - Check text       │          │   - Check text       │
        │   - Check tag        │          │   - Check tag        │
        └──────────────────────┘          └──────────────────────┘
                    │                                 │
                    ▼                                 │
        ┌──────────────────────┐                     │
        │  AI MODERATION       │                     │
        │  (TEXT ONLY!)        │                     ├─ SKIP
        │  - Sentiment check   │                     │  (Teacher
        │  - Toxic keywords    │                     │   Bypass)
        │  - Returns approved/ │                     │
        │    blocked           │                     │
        └──────────────────────┘                     │
                    │                                 │
        ┌───────────┴───────────┐                    │
        │                       │                    │
        ▼                       ▼                    ▼
  [APPROVED]              [BLOCKED]          [AUTO-APPROVED]
        │                       │                    │
        │                       ▼                    │
        │           ┌──────────────────────┐         │
        │           │  Delete Uploaded     │         │
        │           │  Image File          │         │
        │           │  fs.unlinkSync()     │         │
        │           └──────────────────────┘         │
        │                       │                    │
        │                       ▼                    │
        │           ┌──────────────────────┐         │
        │           │  Save Blocked Post   │         │
        │           │  (image = NULL)      │         │
        │           │  Log reason          │         │
        │           └──────────────────────┘         │
        │                       │                    │
        │                       ▼                    │
        │           ┌──────────────────────┐         │
        │           │  Update Trust Signal │         │
        │           │  (increment blocked  │         │
        │           │   post count)        │         │
        │           └──────────────────────┘         │
        │                       │                    │
        │                       ▼                    │
        │           ┌──────────────────────┐         │
        │           │  Return Error 400    │         │
        │           │  "Post blocked..."   │         │
        │           └──────────────────────┘         │
        │                                            │
        └────────────────────┬───────────────────────┘
                             ▼
                ┌──────────────────────────┐
                │  Save Post to Database   │
                │  - content               │
                │  - tag                   │
                │  - image: "/uploads/..." │
                │  - moderation_status:    │
                │    "approved"            │
                │  - user_id               │
                │  - created_at            │
                └──────────────────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │  Return Success 201      │
                │  { message, postId }     │
                └──────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND RESPONSE                                     │
│  - Show success message                                                      │
│  - Clear form                                                                │
│  - Refresh feed                                                              │
│  - Close form                                                                │
└─────────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEED DISPLAY                                          │
│  GET /api/[student|teacher]/feed                                             │
│    └─> Fetch approved posts with user info                                  │
│    └─> Render PostCard components                                           │
│    └─> Display images from /uploads/{filename}                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🖼️ Image Storage Flow

```
Upload Initiated
       │
       ▼
┌─────────────────┐
│  User Selects   │
│  Image File     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Frontend       │
│  Validation     │
│  - Type check   │
│  - Size check   │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  FileReader     │
│  Creates        │
│  Preview        │
│  (Base64)       │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Add to         │
│  FormData       │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Send to        │
│  Backend        │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Multer         │
│  Receives       │
│  File           │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Validate       │
│  MIME Type      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Generate       │
│  Unique         │
│  Filename       │
│  timestamp-     │
│  random.ext     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Save to        │
│  /uploads/      │
│  Directory      │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Get File Path  │
│  /uploads/      │
│  image-xxx.jpg  │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  AI Moderation  │
│  (text only)    │
└─────────────────┘
       │
       ├─── Blocked ──────┐
       │                  ▼
       │          ┌─────────────────┐
       │          │  fs.unlinkSync  │
       │          │  Delete file    │
       │          └─────────────────┘
       │
       ▼
   Approved
       │
       ▼
┌─────────────────┐
│  Store Path in  │
│  Database       │
│  image column   │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Serve via      │
│  Static Route   │
│  /uploads/*     │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│  Display in     │
│  Feed           │
│  <img src=...>  │
└─────────────────┘
```

---

## 🔐 Security Layers

```
┌──────────────────────────────────────────┐
│         Layer 1: Frontend                 │
│  ✓ File type filter (accept attribute)   │
│  ✓ JS validation (MIME type)             │
│  ✓ Size check (5MB)                      │
│  ✓ Preview before upload                 │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│         Layer 2: Multer                   │
│  ✓ MIME type validation                  │
│  ✓ File size limit (5MB)                 │
│  ✓ File filter function                  │
│  ✓ Controlled destination                │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│         Layer 3: Backend Route            │
│  ✓ Input validation                      │
│  ✓ Authentication required               │
│  ✓ Role-based access                     │
│  ✓ Error handling                        │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│         Layer 4: Storage                  │
│  ✓ Unique filenames (no overwrites)      │
│  ✓ Dedicated directory                   │
│  ✓ No execution permissions              │
│  ✓ Cleanup on errors                     │
└──────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│         Layer 5: Serving                  │
│  ✓ Static file middleware only           │
│  ✓ Controlled path (/uploads/*)          │
│  ✓ No directory listing                  │
│  ✓ CORS protection                       │
└──────────────────────────────────────────┘
```

---

## 📂 File Structure

```
B1144SR2NATIONALS/
│
├── uploads/                    # Image storage
│   ├── .gitkeep               # Keep directory in git
│   └── image-1704712345678-123456789.jpg  # Uploaded files
│
├── middleware/
│   └── upload.js              # Multer configuration
│
├── routes/
│   ├── student.routes.js      # POST /post with moderation
│   └── teacher.routes.js      # POST /post without moderation
│                              # GET /feed
│
├── client/src/
│   ├── pages/
│   │   ├── student/
│   │   │   └── Feed.jsx       # Student feed with upload
│   │   └── teacher/
│   │       └── Feed.jsx       # Teacher feed with upload
│   │
│   └── components/
│       └── PostCard.jsx       # Displays posts with images
│
└── database/
    └── school.db              # SQLite database
```

---

## 🎯 Key Decision Points

### 1. File or URL?
**Decision**: File upload only  
**Reason**: Security, control, validation

### 2. Where to store?
**Decision**: Local /uploads directory  
**Reason**: Simple, demo-ready, can migrate to cloud later

### 3. When to moderate?
**Decision**: After file upload, before DB save  
**Reason**: Can clean up file if blocked

### 4. What to moderate?
**Decision**: Text only, never images  
**Reason**: Performance, simplicity, requirements

### 5. Student vs Teacher?
**Decision**: Different routes, same logic  
**Reason**: Clear separation, bypass for teachers

---

## 💡 Benefits of This Architecture

✅ **Secure**: Multiple validation layers  
✅ **Clean**: Automatic file cleanup on errors  
✅ **Efficient**: No unnecessary processing  
✅ **Scalable**: Easy to migrate to cloud storage  
✅ **Maintainable**: Clear separation of concerns  
✅ **User-friendly**: Preview, validation messages  
✅ **Role-aware**: Different rules for students/teachers  
✅ **Compliant**: Meets all non-negotiable requirements  

---

This flow ensures a robust, secure, and user-friendly post creation experience!
