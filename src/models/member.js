const getMemberSchema = (user, guild) => ({
  // Basic member information
  userId: user.id,
  guildId: guild.id,
  username: user.username,
  discriminator: user.discriminator,
  avatar: user.avatar,
  nickname: null,
  
  // Experience and leveling
  xp: 0,
  level: 0,
  totalXP: 0,
  xpMultiplier: 1.0,
  lastXPGain: null,
  
  // Economy
  balance: 100, // Starting balance
  bank: 0,
  totalEarned: 100,
  totalSpent: 0,
  dailyStreak: 0,
  lastDaily: null,
  lastWork: null,
  
  // Inventory and items
  inventory: [],
  equipment: {
    badge: null,
    background: null,
    frame: null
  },
  
  // Statistics
  statistics: {
    // Message statistics
    messagesSent: 0,
    messagesDeleted: 0,
    messagesEdited: 0,
    charactersTyped: 0,
    wordsTyped: 0,
    
    // Command statistics
    commandsUsed: 0,
    commandsToday: 0,
    favoriteCommand: null,
    
    // Voice statistics
    voiceTime: 0, // in minutes
    voiceJoins: 0,
    voiceChannelsUsed: [],
    
    // Social statistics
    reactionsGiven: 0,
    reactionsReceived: 0,
    mentionsGiven: 0,
    mentionsReceived: 0,
    
    // Activity statistics
    daysActive: 0,
    longestStreak: 0,
    currentStreak: 0,
    lastActive: new Date().toISOString(),
    firstMessage: null,
    
    // Moderation statistics
    warningsReceived: 0,
    mutesReceived: 0,
    kicksReceived: 0,
    bansReceived: 0,
    
    // Level statistics
    levelUps: 0,
    timeToLevel: [],
    fastestLevelUp: null
  },
  
  // History and logs
  history: {
    // Command history (last 50)
    commandLog: [],
    
    // Interaction history
    interactionLog: [],
    
    // Daily activity log
    dailyLog: [],
    
    // Level history
    levelHistory: [],
    
    // Economy transactions (last 100)
    transactions: [],
    
    // Moderation history
    moderationHistory: [],
    
    // Name/nickname changes
    nameHistory: [{
      username: user.username,
      discriminator: user.discriminator,
      nickname: null,
      changedAt: new Date().toISOString()
    }]
  },
  
  // Achievements and badges
  achievements: [],
  badges: [],
  titles: [],
  
  // Cooldowns
  cooldowns: {
    daily: null,
    work: null,
    rob: null,
    crime: null,
    slots: null,
    blackjack: null,
    xp: null
  },
  
  // Preferences
  preferences: {
    dmNotifications: true,
    levelUpNotifications: true,
    economyNotifications: true,
    language: "en",
    timezone: "UTC",
    profilePrivacy: "public", // public, friends, private
    showStats: true,
    showInventory: true,
    showAchievements: true
  },
  
  // Moderation data
  moderation: {
    warnings: [],
    mutes: [],
    kicks: [],
    bans: [],
    notes: [],
    totalPoints: 0,
    lastPunishment: null,
    automodViolations: 0
  },
  
  // Social features
  social: {
    reputation: 0,
    givenRep: [],
    receivedRep: [],
    friends: [],
    blocked: [],
    marriedTo: null,
    marriedAt: null
  },
  
  // Custom data
  custom: {
    bio: "",
    color: "#5865f2",
    birthday: null,
    location: null,
    website: null,
    customFields: {}
  },
  
  // Temporary data
  temp: {
    afk: {
      active: false,
      reason: null,
      since: null
    },
    muted: {
      active: false,
      until: null,
      reason: null,
      mutedBy: null
    },
    banned: {
      active: false,
      until: null,
      reason: null,
      bannedBy: null
    }
  },
  
  // Roles and permissions
  roles: {
    current: [],
    history: [],
    autoRoles: [],
    tempRoles: []
  },
  
  // Activity tracking
  activity: {
    joinedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    onlineTime: 0,
    statusHistory: [],
    channelActivity: {},
    hourlyActivity: Array(24).fill(0),
    weeklyActivity: Array(7).fill(0)
  },
  
  // Metadata
  version: "2.0",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

module.exports = { getMemberSchema };