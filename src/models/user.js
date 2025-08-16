const getUserSchema = (user) => ({
  userId: user.id,
  username: user.username,
  discriminator: user.discriminator,
  avatar: user.avatar,
  bot: user.bot || false,
  
  // Global statistics across all guilds
  globalStats: {
    totalCommands: 0,
    totalMessages: 0,
    totalXP: 0,
    totalLevels: 0,
    guildsJoined: 0,
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString()
  },
  
  // Guild-specific data
  guilds: {},
  
  // Global achievements
  achievements: [],
  
  // User preferences
  preferences: {
    language: "en",
    timezone: "UTC",
    notifications: {
      levelUp: true,
      achievements: true,
      dailyReminder: false
    },
    privacy: {
      showStats: true,
      showAchievements: true,
      allowDMs: true
    }
  },
  
  // Premium features
  premium: {
    active: false,
    tier: 0,
    expiresAt: null,
    features: []
  },
  
  // Moderation history across all guilds
  moderationHistory: {
    totalWarns: 0,
    totalMutes: 0,
    totalBans: 0,
    incidents: []
  },
  
  // Economy data (global wallet)
  economy: {
    globalCoins: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactions: []
  },
  
  // Social features
  social: {
    friends: [],
    blocked: [],
    reputation: 0,
    badges: []
  },
  
  // Activity tracking
  activity: {
    commandsToday: 0,
    messagesThisWeek: 0,
    streak: {
      current: 0,
      longest: 0,
      lastActive: null
    }
  },
  
  // Metadata
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: "2.0"
});

module.exports = { getUserSchema };