const { db, fb } = require("./firebase");
const log = require("./logger");
const { FieldValue } = require("firebase-admin/firestore");
const { getGuildSchema } = require("../models/guild");
const { getMemberSchema } = require("../models/member");
const { getUserSchema } = require("../models/user");
const cache = require("./cache");
const metrics = require("./metrics");
const EventEmitter = require("events");

class ClientLibrary extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.cache = cache;
    this.metrics = metrics;
    this.rateLimits = new Map();
    this.activeOperations = new Map();
    this.initialized = false;
  }

  setClient(client) {
    this.client = client;
  }

  async initialize() {
    if (this.initialized) return;
    
    await this.cache.initialize();
    await this.metrics.initialize();
    
    // Setup periodic cleanup
    setInterval(() => this.cleanup(), 300000); // 5 minutes
    
    this.initialized = true;
    log.success("ClientLibrary initialized successfully");
  }

  // Command execution tracking with advanced metrics
  async incCmd(commandName = "unknown", userId = null, guildId = null) {
    try {
      const timestamp = Date.now();
      
      // Update global command counter
      await db.collection("bot").doc("config").update({
        "status.commandsExecuted": fb.FieldValue.increment(1),
        "status.lastCommandAt": fb.Timestamp.now(),
        "status.lastUpdated": fb.Timestamp.now()
      });

      // Update command-specific metrics
      await this.metrics.recordCommand(commandName, userId, guildId, timestamp);
      
      // Update cache
      await this.cache.incrementCounter(`commands:${commandName}`, 1, 3600);
      await this.cache.incrementCounter("commands:total", 1, 3600);
      
      // Emit event for real-time monitoring
      this.emit("commandExecuted", { commandName, userId, guildId, timestamp });
      
      log.debug(`Command executed: ${commandName} by ${userId} in ${guildId}`);
    } catch (err) {
      log.error("Failed to update command count:", err);
      throw err;
    }
  }

  // Advanced status update with performance metrics
  async updateStatus(client) {
    if (!client?.user) return;
    
    try {
      const startTime = Date.now();
      
      // Calculate comprehensive stats
      const stats = {
        members: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        servers: client.guilds.cache.size,
        channels: client.channels.cache.size,
        users: client.users.cache.size,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        ping: client.ws.ping,
        shards: client.shard ? client.shard.count : 1,
        clusterId: client.cluster?.id || 0
      };

      // Update database
      const ref = db.collection("bot").doc("config");
      await ref.set({
        status: {
          ...stats,
          lastUpdated: fb.Timestamp.now(),
          performance: {
            responseTime: Date.now() - startTime,
            cpuUsage: process.cpuUsage(),
            nodeVersion: process.version
          }
        }
      }, { merge: true });

      // Update cache for quick access
      await this.cache.set("bot:status", stats, 60);
      
      // Record metrics
      await this.metrics.recordStatus(stats);
      
      log.info(`Status updated: ${stats.members} members / ${stats.servers} servers / ${stats.ping}ms ping`);
      
      return stats;
    } catch (err) {
      log.error("Failed to update status:", err);
      throw err;
    }
  }

  // Enhanced guild management with validation and caching
  async updateGuilds(client, action, guild) {
    if (!action || !guild) return;
    
    const guildRef = db.collection("guilds").doc(guild.id);
    const cacheKey = `guild:${guild.id}`;
    
    try {
      if (action === "guildCreate") {
        // Check if guild already exists
        const existing = await this.cache.get(cacheKey);
        if (existing) {
          log.warn(`Guild ${guild.id} already exists in cache`);
          return;
        }

        const newGuildDocument = getGuildSchema(guild);
        
        // Enhanced guild data
        newGuildDocument.info.features = guild.features || [];
        newGuildDocument.info.premiumTier = guild.premiumTier;
        newGuildDocument.info.premiumSubscriptionCount = guild.premiumSubscriptionCount;
        newGuildDocument.info.region = guild.region;
        newGuildDocument.info.verified = guild.verified;
        newGuildDocument.info.partnered = guild.partnered;
        
        await guildRef.set(newGuildDocument);
        await this.cache.set(cacheKey, newGuildDocument, 3600);
        
        // Initialize guild-specific collections
        await this.initializeGuildCollections(guild.id);
        
        // Record metrics
        await this.metrics.recordGuildJoin(guild);
        
        log.success(`Server joined: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
        
      } else if (action === "guildDelete") {
        const updateData = {
          active: false,
          "info.memberCount": guild.memberCount,
          "info.leftAt": fb.Timestamp.now(),
          updatedAt: fb.Timestamp.now()
        };
        
        await guildRef.update(updateData);
        await this.cache.delete(cacheKey);
        
        // Record metrics
        await this.metrics.recordGuildLeave(guild);
        
        log.info(`Server left: ${guild.name} (${guild.id})`);
      }
      
      // Update global server count
      await this.updateStatus(client);
      
    } catch (err) {
      log.error(`Failed to update guild ${guild.id}:`, err);
      throw err;
    }
  }

  // Advanced member management with XP, economy, and analytics
  async updateMembers(guild, interaction, action = "interaction") {
    if (!guild || !interaction?.user) return;
    
    const memberRef = db.collection("guilds").doc(guild.id).collection("members").doc(interaction.user.id);
    const userRef = db.collection("users").doc(interaction.user.id);
    const cacheKey = `member:${guild.id}:${interaction.user.id}`;
    
    try {
      // Get existing data from cache or database
      let memberData = await this.cache.get(cacheKey);
      if (!memberData) {
        const doc = await memberRef.get();
        memberData = doc.exists ? doc.data() : getMemberSchema(interaction.user, guild);
      }
      
      // Update member data based on action
      const updates = {
        updatedAt: fb.Timestamp.now(),
        "statistics.lastActivity": fb.Timestamp.now()
      };
      
      switch (action) {
        case "interaction":
          updates["statistics.commandsUsed"] = fb.FieldValue.increment(1);
          updates["history.commandLog"] = fb.FieldValue.arrayUnion({
            command: interaction.commandName,
            timestamp: fb.Timestamp.now(),
            channel: interaction.channel?.id
          });
          break;
          
        case "message":
          updates["statistics.messagesSent"] = fb.FieldValue.increment(1);
          updates["xp"] = fb.FieldValue.increment(Math.floor(Math.random() * 15) + 5);
          break;
          
        case "voice":
          updates["statistics.voiceTime"] = fb.FieldValue.increment(1);
          break;
      }
      
      // Apply updates
      await memberRef.set(updates, { merge: true });
      
      // Update global user data
      await this.updateGlobalUser(interaction.user, guild);
      
      // Update cache
      const updatedData = { ...memberData, ...updates };
      await this.cache.set(cacheKey, updatedData, 1800);
      
      // Check for level up
      if (action === "message") {
        await this.checkLevelUp(guild.id, interaction.user.id, updatedData);
      }
      
      log.debug(`Member updated: ${interaction.user.tag} in ${guild.name}`);
      
    } catch (err) {
      log.error(`Failed to update member ${interaction.user.id} in ${guild.id}:`, err);
      throw err;
    }
  }

  // Global user management across all guilds
  async updateGlobalUser(user, guild = null) {
    const userRef = db.collection("users").doc(user.id);
    const cacheKey = `user:${user.id}`;
    
    try {
      let userData = await this.cache.get(cacheKey);
      if (!userData) {
        const doc = await userRef.get();
        userData = doc.exists ? doc.data() : getUserSchema(user);
      }
      
      const updates = {
        username: user.username,
        discriminator: user.discriminator,
        avatar: user.avatar,
        updatedAt: fb.Timestamp.now(),
        "statistics.lastSeen": fb.Timestamp.now()
      };
      
      if (guild) {
        updates[`guilds.${guild.id}`] = {
          joinedAt: fb.Timestamp.now(),
          active: true
        };
      }
      
      await userRef.set(updates, { merge: true });
      await this.cache.set(cacheKey, { ...userData, ...updates }, 3600);
      
    } catch (err) {
      log.error(`Failed to update global user ${user.id}:`, err);
    }
  }

  // Level system with rewards
  async checkLevelUp(guildId, userId, memberData) {
    const currentXP = memberData.xp || 0;
    const currentLevel = memberData.level || 0;
    const newLevel = Math.floor(0.1 * Math.sqrt(currentXP));
    
    if (newLevel > currentLevel) {
      const memberRef = db.collection("guilds").doc(guildId).collection("members").doc(userId);
      
      await memberRef.update({
        level: newLevel,
        "statistics.levelUps": fb.FieldValue.increment(1),
        "history.levelHistory": fb.FieldValue.arrayUnion({
          level: newLevel,
          timestamp: fb.Timestamp.now(),
          xpAtLevelUp: currentXP
        })
      });
      
      // Award level up rewards
      await this.awardLevelRewards(guildId, userId, newLevel);
      
      this.emit("levelUp", { guildId, userId, newLevel, currentXP });
      log.info(`Level up: User ${userId} reached level ${newLevel} in guild ${guildId}`);
    }
  }

  // Reward system for level ups
  async awardLevelRewards(guildId, userId, level) {
    const rewards = this.calculateLevelRewards(level);
    
    if (rewards.coins > 0) {
      await db.collection("guilds").doc(guildId).collection("members").doc(userId).update({
        balance: fb.FieldValue.increment(rewards.coins)
      });
    }
    
    // Add items to inventory
    if (rewards.items.length > 0) {
      await db.collection("guilds").doc(guildId).collection("members").doc(userId).update({
        inventory: fb.FieldValue.arrayUnion(...rewards.items)
      });
    }
  }

  calculateLevelRewards(level) {
    return {
      coins: level * 100,
      items: level % 5 === 0 ? [`level_${level}_badge`] : []
    };
  }

  // Initialize guild-specific collections and settings
  async initializeGuildCollections(guildId) {
    const collections = [
      { name: "members", doc: "config", data: { initialized: true, createdAt: fb.Timestamp.now() } },
      { name: "moderation", doc: "config", data: { automod: false, logChannel: null } },
      { name: "economy", doc: "config", data: { enabled: true, dailyAmount: 100 } },
      { name: "leveling", doc: "config", data: { enabled: true, multiplier: 1.0 } },
      { name: "automod", doc: "config", data: { enabled: false, filters: [] } }
    ];
    
    for (const collection of collections) {
      await db.collection("guilds").doc(guildId)
        .collection(collection.name).doc(collection.doc)
        .set(collection.data, { merge: true });
    }
  }

  // Advanced analytics and reporting
  async getGuildAnalytics(guildId, timeframe = "7d") {
    const cacheKey = `analytics:${guildId}:${timeframe}`;
    let analytics = await this.cache.get(cacheKey);
    
    if (!analytics) {
      analytics = await this.calculateGuildAnalytics(guildId, timeframe);
      await this.cache.set(cacheKey, analytics, 1800); // 30 minutes cache
    }
    
    return analytics;
  }

  async calculateGuildAnalytics(guildId, timeframe) {
    const days = parseInt(timeframe.replace("d", ""));
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    // Get member activity
    const membersSnapshot = await db.collection("guilds").doc(guildId)
      .collection("members")
      .where("statistics.lastActivity", ">=", fb.Timestamp.fromDate(startDate))
      .get();
    
    const analytics = {
      activeMembers: membersSnapshot.size,
      totalCommands: 0,
      totalMessages: 0,
      levelUps: 0,
      newMembers: 0,
      topCommands: {},
      activityByDay: {}
    };
    
    membersSnapshot.forEach(doc => {
      const data = doc.data();
      analytics.totalCommands += data.statistics?.commandsUsed || 0;
      analytics.totalMessages += data.statistics?.messagesSent || 0;
      analytics.levelUps += data.statistics?.levelUps || 0;
      
      if (data.createdAt?.toDate() >= startDate) {
        analytics.newMembers++;
      }
    });
    
    return analytics;
  }

  // Rate limiting system
  async checkRateLimit(key, limit = 10, window = 60000) {
    const now = Date.now();
    const windowStart = now - window;
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, []);
    }
    
    const requests = this.rateLimits.get(key);
    
    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);
    
    if (validRequests.length >= limit) {
      return false; // Rate limited
    }
    
    validRequests.push(now);
    this.rateLimits.set(key, validRequests);
    
    return true; // Not rate limited
  }

  // Cleanup old data and optimize performance
  async cleanup() {
    try {
      // Clean rate limits
      const now = Date.now();
      for (const [key, requests] of this.rateLimits.entries()) {
        const validRequests = requests.filter(time => time > now - 300000); // 5 minutes
        if (validRequests.length === 0) {
          this.rateLimits.delete(key);
        } else {
          this.rateLimits.set(key, validRequests);
        }
      }
      
      // Clean active operations
      for (const [key, startTime] of this.activeOperations.entries()) {
        if (now - startTime > 300000) { // 5 minutes timeout
          this.activeOperations.delete(key);
        }
      }
      
      // Clean cache
      await this.cache.cleanup();
      
      log.debug("Cleanup completed successfully");
    } catch (err) {
      log.error("Cleanup failed:", err);
    }
  }

  // Health check system
  async healthCheck() {
    const health = {
      status: "healthy",
      timestamp: Date.now(),
      services: {}
    };
    
    try {
      // Check database connection
      await db.collection("bot").doc("config").get();
      health.services.database = "healthy";
    } catch (err) {
      health.services.database = "unhealthy";
      health.status = "degraded";
    }
    
    try {
      // Check cache
      await this.cache.ping();
      health.services.cache = "healthy";
    } catch (err) {
      health.services.cache = "unhealthy";
      health.status = "degraded";
    }
    
    return health;
  }

  // Backup system
  async createBackup(guildId) {
    const backupData = {
      timestamp: fb.Timestamp.now(),
      guild: {},
      members: [],
      settings: {}
    };
    
    // Backup guild data
    const guildDoc = await db.collection("guilds").doc(guildId).get();
    if (guildDoc.exists) {
      backupData.guild = guildDoc.data();
    }
    
    // Backup members (limited to prevent huge backups)
    const membersSnapshot = await db.collection("guilds").doc(guildId)
      .collection("members").limit(1000).get();
    
    membersSnapshot.forEach(doc => {
      backupData.members.push({ id: doc.id, data: doc.data() });
    });
    
    // Store backup
    await db.collection("backups").doc(`${guildId}_${Date.now()}`).set(backupData);
    
    return backupData;
  }
}

// Export singleton instance
const clientLib = new ClientLibrary();

module.exports = clientLib;