const { db, fb } = require("./firebase");
const log = require("./logger");

class MetricsManager {
  constructor() {
    this.buffer = [];
    this.bufferSize = 100;
    this.flushInterval = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flushBuffer();
    }, 30000); // Every 30 seconds
    
    this.initialized = true;
    log.success("Metrics manager initialized");
  }

  async recordCommand(commandName, userId, guildId, timestamp) {
    const metric = {
      type: "command",
      command: commandName,
      userId,
      guildId,
      timestamp: fb.Timestamp.fromMillis(timestamp),
      date: new Date(timestamp).toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  async recordStatus(stats) {
    const metric = {
      type: "status",
      ...stats,
      timestamp: fb.Timestamp.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  async recordGuildJoin(guild) {
    const metric = {
      type: "guild_join",
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      timestamp: fb.Timestamp.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  async recordGuildLeave(guild) {
    const metric = {
      type: "guild_leave",
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      timestamp: fb.Timestamp.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  async recordError(error, context = {}) {
    const metric = {
      type: "error",
      error: error.message,
      stack: error.stack,
      context,
      timestamp: fb.Timestamp.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  async recordPerformance(operation, duration, metadata = {}) {
    const metric = {
      type: "performance",
      operation,
      duration,
      metadata,
      timestamp: fb.Timestamp.now(),
      date: new Date().toISOString().split('T')[0]
    };
    
    this.addToBuffer(metric);
  }

  addToBuffer(metric) {
    this.buffer.push(metric);
    
    if (this.buffer.length >= this.bufferSize) {
      this.flushBuffer();
    }
  }

  async flushBuffer() {
    if (this.buffer.length === 0) return;
    
    try {
      const batch = db.batch();
      const metricsToFlush = [...this.buffer];
      this.buffer = [];
      
      // Group metrics by date for efficient storage
      const groupedMetrics = {};
      
      metricsToFlush.forEach(metric => {
        const date = metric.date;
        if (!groupedMetrics[date]) {
          groupedMetrics[date] = [];
        }
        groupedMetrics[date].push(metric);
      });
      
      // Write grouped metrics
      for (const [date, metrics] of Object.entries(groupedMetrics)) {
        const docRef = db.collection("metrics").doc(date);
        batch.set(docRef, {
          metrics: fb.FieldValue.arrayUnion(...metrics),
          lastUpdated: fb.Timestamp.now()
        }, { merge: true });
      }
      
      await batch.commit();
      log.debug(`Flushed ${metricsToFlush.length} metrics to database`);
      
    } catch (err) {
      log.error("Failed to flush metrics buffer:", err);
      // Re-add failed metrics to buffer
      this.buffer.unshift(...metricsToFlush);
    }
  }

  async getMetrics(type, startDate, endDate) {
    try {
      const start = new Date(startDate).toISOString().split('T')[0];
      const end = new Date(endDate).toISOString().split('T')[0];
      
      const snapshot = await db.collection("metrics")
        .where(fb.FieldPath.documentId(), ">=", start)
        .where(fb.FieldPath.documentId(), "<=", end)
        .get();
      
      const metrics = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.metrics) {
          const filteredMetrics = data.metrics.filter(m => !type || m.type === type);
          metrics.push(...filteredMetrics);
        }
      });
      
      return metrics;
    } catch (err) {
      log.error("Failed to get metrics:", err);
      return [];
    }
  }

  async getCommandStats(timeframe = "7d") {
    const days = parseInt(timeframe.replace("d", ""));
    const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    const endDate = new Date();
    
    const metrics = await this.getMetrics("command", startDate, endDate);
    
    const stats = {
      total: metrics.length,
      byCommand: {},
      byGuild: {},
      byUser: {},
      byDay: {}
    };
    
    metrics.forEach(metric => {
      // By command
      stats.byCommand[metric.command] = (stats.byCommand[metric.command] || 0) + 1;
      
      // By guild
      if (metric.guildId) {
        stats.byGuild[metric.guildId] = (stats.byGuild[metric.guildId] || 0) + 1;
      }
      
      // By user
      if (metric.userId) {
        stats.byUser[metric.userId] = (stats.byUser[metric.userId] || 0) + 1;
      }
      
      // By day
      const day = metric.date;
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });
    
    return stats;
  }

  async getPerformanceStats(operation = null, timeframe = "24h") {
    const hours = parseInt(timeframe.replace("h", ""));
    const startDate = new Date(Date.now() - (hours * 60 * 60 * 1000));
    const endDate = new Date();
    
    const metrics = await this.getMetrics("performance", startDate, endDate);
    const filteredMetrics = operation ? 
      metrics.filter(m => m.operation === operation) : metrics;
    
    if (filteredMetrics.length === 0) {
      return { count: 0, avgDuration: 0, minDuration: 0, maxDuration: 0 };
    }
    
    const durations = filteredMetrics.map(m => m.duration);
    
    return {
      count: filteredMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.percentile(durations, 0.95),
      p99Duration: this.percentile(durations, 0.99)
    };
  }

  percentile(arr, p) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushBuffer(); // Final flush
  }
}

module.exports = new MetricsManager();