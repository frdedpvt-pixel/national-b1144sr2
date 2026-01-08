export const config = {
  // JWT Configuration
  jwtSecret: 'school-network-secret-key-change-in-production-2026',
  jwtExpiresIn: '7d',

  // Teacher/Admin Email Whitelist
  teacherWhitelist: [
    'teacher1@school.edu',
    'teacher2@school.edu',
    'admin@school.edu',
    'principal@school.edu'
  ],

  // AI Moderation Configuration
  moderation: {
    // Sentiment threshold (comparative score)
    sentimentThreshold: -2,

    // Toxic keyword blacklist
    toxicKeywords: [
      'hate', 'stupid', 'idiot', 'dumb', 'loser',
      'ugly', 'fat', 'kill', 'die', 'shut up',
      'bullying', 'bully', 'racist', 'sexist'
    ]
  },

  // Post Tags
  postTags: [
    '#Academics',
    '#Sports',
    '#Art',
    '#Fest'
  ],

  // Event Types and Colors
  eventTypes: {
    exam: { label: 'Exam/Test', color: '#ef4444' },      // Red
    holiday: { label: 'Holiday/Festival', color: '#22c55e' }, // Green
    sports: { label: 'Sports/Cultural', color: '#3b82f6' }    // Blue
  },

  // Server Configuration
  port: 5001,
  clientUrl: 'http://localhost:5173'
};
