const getGuildSchema = (guild) => ({
  // Basic guild information
  info: {
    id: guild.id,
    name: guild.name,
    description: guild.description,
    icon: guild.icon,
    banner: guild.banner,
    splash: guild.splash,
    ownerId: guild.ownerId,
    memberCount: guild.memberCount,
    maxMembers: guild.maxMembers,
    premiumTier: guild.premiumTier,
    premiumSubscriptionCount: guild.premiumSubscriptionCount,
    features: guild.features || [],
    region: guild.region,
    verified: guild.verified || false,
    partnered: guild.partnered || false,
    joinedAt: new Date().toISOString(),
    leftAt: null,
    active: true
  },
  
  // Bot configuration settings
  settings: {
    prefix: "!",
    language: guild.preferredLocale || "en-US",
    localeType: "default", // default, guild, member
    timezone: "UTC",
    
    // Channel configurations
    channels: {
      welcome: null,
      goodbye: null,
      general: null,
      announcements: null,
      logs: {
        moderation: null,
        messages: null,
        members: null,
        voice: null,
        server: null
      },
      automod: null,
      suggestions: null,
      reports: null
    },
    
    // Role configurations
    roles: {
      autorole: null,
      moderator: [],
      admin: [],
      muted: null,
      verified: null,
      premium: null,
      levelRoles: {}
    },
    
    // Permission overrides
    permissions: {
      adminRoles: [],
      modRoles: [],
      bypassRoles: [],
      commandPermissions: {}
    }
  },
  
  // Feature configurations
  features: {
    // Leveling system
    leveling: {
      enabled: true,
      multiplier: 1.0,
      channel: null,
      noXpChannels: [],
      noXpRoles: [],
      levelUpMessage: "🎉 Congratulations {user}! You've reached level **{level}**!",
      levelUpDM: false,
      stackedRoles: true,
      levelRoles: {},
      xpPerMessage: { min: 5, max: 15 },
      cooldown: 60000 // 1 minute
    },
    
    // Economy system
    economy: {
      enabled: true,
      currencyName: "coins",
      currencySymbol: "🪙",
      dailyAmount: { min: 50, max: 150 },
      workAmount: { min: 100, max: 300 },
      initialBalance: 100,
      maxBalance: 1000000,
      shop: {
        enabled: true,
        items: []
      },
      gambling: {
        enabled: false,
        maxBet: 1000
      }
    },
    
    // Moderation features
    moderation: {
      enabled: true,
      automod: {
        enabled: false,
        antiSpam: {
          enabled: false,
          maxMessages: 5,
          timeframe: 5000,
          punishment: "mute"
        },
        antiInvite: {
          enabled: false,
          whitelist: [],
          punishment: "warn"
        },
        antiLink: {
          enabled: false,
          whitelist: [],
          punishment: "warn"
        },
        badWords: {
          enabled: false,
          words: [],
          punishment: "warn"
        },
        antiCaps: {
          enabled: false,
          percentage: 70,
          minLength: 10,
          punishment: "warn"
        }
      },
      warnings: {
        enabled: true,
        maxWarnings: 3,
        autoAction: "mute",
        expireAfter: 2592000000 // 30 days
      },
      tempActions: {
        enabled: true,
        maxDuration: 2592000000 // 30 days
      }
    },
    
    // Welcome/Goodbye system
    welcome: {
      enabled: false,
      channel: null,
      message: "Welcome to **{server}**, {user}! 👋",
      embed: {
        enabled: false,
        color: "#5865f2",
        title: "Welcome!",
        description: "Welcome to **{server}**, {user}!",
        thumbnail: true,
        footer: "Member #{memberCount}"
      },
      dm: {
        enabled: false,
        message: "Welcome to **{server}**! Please read the rules."
      },
      autorole: null
    },
    
    goodbye: {
      enabled: false,
      channel: null,
      message: "Goodbye **{user}**! 👋",
      embed: {
        enabled: false,
        color: "#f04747",
        title: "Goodbye!",
        description: "**{user}** has left the server.",
        thumbnail: true
      }
    },
    
    // Reaction roles
    reactionRoles: {
      enabled: false,
      messages: []
    },
    
    // Suggestions system
    suggestions: {
      enabled: false,
      channel: null,
      reviewChannel: null,
      anonymousAllowed: true,
      votingEnabled: true,
      autoThread: false
    },
    
    // Ticket system
    tickets: {
      enabled: false,
      category: null,
      supportRoles: [],
      maxTickets: 3,
      transcripts: {
        enabled: true,
        channel: null
      }
    },
    
    // Music system
    music: {
      enabled: false,
      maxQueueSize: 100,
      maxSongDuration: 600000, // 10 minutes
      djRole: null,
      voteskipPercentage: 50
    },
    
    // Custom commands
    customCommands: {
      enabled: true,
      commands: []
    },
    
    // Starboard
    starboard: {
      enabled: false,
      channel: null,
      threshold: 3,
      emoji: "⭐",
      selfStar: false,
      botStar: false
    }
  },
  
  // Statistics and analytics
  statistics: {
    // Member statistics
    members: {
      joined: 0,
      left: 0,
      kicked: 0,
      banned: 0,
      current: guild.memberCount
    },
    
    // Message statistics
    messages: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byChannel: {},
      byUser: {}
    },
    
    // Command statistics
    commands: {
      total: 0,
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      byCommand: {},
      byUser: {}
    },
    
    // Voice statistics
    voice: {
      totalMinutes: 0,
      activeUsers: 0,
      byChannel: {},
      byUser: {}
    },
    
    // Daily statistics
    daily: {
      date: new Date().toISOString().slice(0, 10),
      joins: 0,
      leaves: 0,
      messages: 0,
      commands: 0,
      voiceMinutes: 0
    },
    
    // Growth tracking
    growth: {
      memberGrowth: [],
      activityGrowth: [],
      retentionRate: 0
    }
  },
  
  // Premium features
  premium: {
    active: false,
    tier: 0,
    features: [],
    expiresAt: null,
    activatedBy: null,
    activatedAt: null
  },
  
  // Backup and recovery
  backup: {
    enabled: false,
    frequency: "weekly",
    lastBackup: null,
    autoRestore: false
  },
  
  // API and webhooks
  integrations: {
    webhooks: [],
    apis: [],
    bots: []
  },
  
  // Metadata
  version: "2.0",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastActivity: new Date().toISOString()
});

module.exports = { getGuildSchema };