/**
 * Simple in-memory cache for dashboard performance optimization
 * Reduces database load by caching frequently accessed data
 */

class SimpleCache {
    constructor() {
        this.cache = new Map();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get value from cache if not expired
     * @param {string} key - Cache key
     * @returns {any|null} - Cached data or null if expired/missing
     */
    get(key) {
        const item = this.cache.get(key);
        if (!item) {
            this.misses++;
            return null;
        }
        
        // Check if expired
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            this.misses++;
            return null;
        }
        
        this.hits++;
        return item.data;
    }

    /**
     * Set value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttlSeconds - Time to live in seconds (default: 60)
     */
    set(key, data, ttlSeconds = 60) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + (ttlSeconds * 1000),
            createdAt: Date.now()
        });
    }

    /**
     * Delete specific key from cache
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
    }

    /**
     * Get cache statistics
     * @returns {object} - Cache stats
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.cache.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? ((this.hits / total) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Clean expired entries (optional maintenance)
     */
    cleanExpired() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        return cleaned;
    }
}

// Export singleton instance
const dashboardCache = new SimpleCache();

// Optional: Clean expired entries every 5 minutes
setInterval(() => {
    const cleaned = dashboardCache.cleanExpired();
    if (cleaned > 0) {
        console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
}, 5 * 60 * 1000);

// Log cache stats every 10 minutes (optional - can be disabled in production)
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        const stats = dashboardCache.getStats();
        console.log('[Cache] Stats:', stats);
    }, 10 * 60 * 1000);
}

module.exports = { dashboardCache, SimpleCache };
