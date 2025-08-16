const log = require("./logger");

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
    this.maxSize = 10000; // Maximum cache entries
    this.cleanupInterval = null;
  }

  async initialize() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Every minute
    
    log.success("Cache manager initialized");
  }

  async set(key, value, ttlSeconds = 3600) {
    try {
      // Check cache size limit
      if (this.cache.size >= this.maxSize) {
        this.evictOldest();
      }
      
      this.cache.set(key, {
        value,
        createdAt: Date.now(),
        accessCount: 0
      });
      
      if (ttlSeconds > 0) {
        this.ttl.set(key, Date.now() + (ttlSeconds * 1000));
      }
      
      this.stats.sets++;
      return true;
    } catch (err) {
      log.error(`Cache set error for key ${key}:`, err);
      return false;
    }
  }

  async get(key) {
    try {
      // Check if key exists and not expired
      if (this.isExpired(key)) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }
      
      const entry = this.cache.get(key);
      if (!entry) {
        this.stats.misses++;
        return null;
      }
      
      // Update access statistics
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      
      this.stats.hits++;
      return entry.value;
    } catch (err) {
      log.error(`Cache get error for key ${key}:`, err);
      this.stats.misses++;
      return null;
    }
  }

  async delete(key) {
    try {
      const deleted = this.cache.delete(key);
      this.ttl.delete(key);
      
      if (deleted) {
        this.stats.deletes++;
      }
      
      return deleted;
    } catch (err) {
      log.error(`Cache delete error for key ${key}:`, err);
      return false;
    }
  }

  async has(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  async clear() {
    this.cache.clear();
    this.ttl.clear();
    log.info("Cache cleared");
  }

  async incrementCounter(key, amount = 1, ttlSeconds = 3600) {
    const current = await this.get(key) || 0;
    const newValue = current + amount;
    await this.set(key, newValue, ttlSeconds);
    return newValue;
  }

  isExpired(key) {
    const expiry = this.ttl.get(key);
    if (!expiry) return false;
    return Date.now() > expiry;
  }

  cleanupExpired() {
    let cleaned = 0;
    for (const [key, expiry] of this.ttl.entries()) {
      if (Date.now() > expiry) {
        this.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  evictOldest() {
    // Find oldest entry by creation time
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      log.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
    return {
      ...this.stats,
      hitRate: isNaN(hitRate) ? 0 : hitRate.toFixed(2),
      size: this.cache.size,
      maxSize: this.maxSize
    };
  }

  async ping() {
    const testKey = `ping_${Date.now()}`;
    await this.set(testKey, "pong", 1);
    const result = await this.get(testKey);
    await this.delete(testKey);
    return result === "pong";
  }

  async cleanup() {
    this.cleanupExpired();
    
    // If cache is still too large, evict least recently used
    while (this.cache.size > this.maxSize * 0.8) {
      this.evictLRU();
    }
  }

  evictLRU() {
    let lruKey = null;
    let lruTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      const lastAccess = entry.lastAccessed || entry.createdAt;
      if (lastAccess < lruTime) {
        lruTime = lastAccess;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.delete(lruKey);
    }
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

module.exports = new CacheManager();