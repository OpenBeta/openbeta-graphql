/**
 * Enhanced error monitoring and alerting system
 */

export interface ErrorStats {
  totalErrors: number
  errorsByType: Map<string, number>
  recentErrors: Array<{
    timestamp: Date
    error: string
    type: string
    stack?: string
  }>
  lastReset: Date
}

export class ErrorMonitor {
  private stats: ErrorStats = {
    totalErrors: 0,
    errorsByType: new Map(),
    recentErrors: [],
    lastReset: new Date()
  }

  private readonly maxRecentErrors = 100
  private readonly alertThresholds = {
    errorsPerMinute: 10,
    totalErrors: 50
  }

  logError (error: Error, type: string = 'unknown', context?: any): void {
    this.stats.totalErrors++

    // Track errors by type
    const currentCount = this.stats.errorsByType.get(type) ?? 0
    this.stats.errorsByType.set(type, currentCount + 1)

    // Add to recent errors
    this.stats.recentErrors.push({
      timestamp: new Date(),
      error: error.message,
      type,
      stack: error.stack
    })

    // Keep only recent errors
    if (this.stats.recentErrors.length > this.maxRecentErrors) {
      this.stats.recentErrors = this.stats.recentErrors.slice(-this.maxRecentErrors)
    }

    // Log the error with context
    console.error(`[${type}] Error:`, {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    })

    // Check if we need to alert
    this.checkAlertThresholds()
  }

  logGraphQLError (error: any, query?: string, variables?: any): void {
    const errorType = error.extensions?.code ?? 'GRAPHQL_ERROR'
    this.logError(error, errorType, { query, variables })
  }

  logNetworkError (error: Error, url?: string, method?: string): void {
    this.logError(error, 'NETWORK_ERROR', { url, method })
  }

  logDatabaseError (error: Error, operation?: string): void {
    this.logError(error, 'DATABASE_ERROR', { operation })
  }

  private checkAlertThresholds (): void {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)

    // Count errors in the last minute
    const recentErrorCount = this.stats.recentErrors.filter(
      err => err.timestamp > oneMinuteAgo
    ).length

    if (recentErrorCount >= this.alertThresholds.errorsPerMinute) {
      console.error(`🚨 HIGH ERROR RATE ALERT: ${recentErrorCount} errors in the last minute`)
      this.logSystemStatus()
    }

    if (this.stats.totalErrors >= this.alertThresholds.totalErrors) {
      console.error(`🚨 HIGH TOTAL ERROR COUNT: ${this.stats.totalErrors} total errors since ${this.stats.lastReset}`)
    }
  }

  private logSystemStatus (): void {
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    console.log('System Status:', {
      uptime: `${Math.round(uptime / 60)} minutes`,
      memory: {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
      },
      errors: {
        total: this.stats.totalErrors,
        byType: Object.fromEntries(this.stats.errorsByType)
      }
    })
  }

  getStats (): ErrorStats {
    return {
      ...this.stats,
      errorsByType: new Map(this.stats.errorsByType),
      recentErrors: [...this.stats.recentErrors]
    }
  }

  reset (): void {
    this.stats = {
      totalErrors: 0,
      errorsByType: new Map(),
      recentErrors: [],
      lastReset: new Date()
    }
  }

  // Get health status based on error rates
  getHealthStatus (): 'healthy' | 'warning' | 'critical' {
    const now = new Date()
    const oneMinuteAgo = new Date(now.getTime() - 60000)
    const fiveMinutesAgo = new Date(now.getTime() - 300000)

    const errorsLastMinute = this.stats.recentErrors.filter(
      err => err.timestamp > oneMinuteAgo
    ).length

    const errorsLastFiveMinutes = this.stats.recentErrors.filter(
      err => err.timestamp > fiveMinutesAgo
    ).length

    if (errorsLastMinute >= 10) return 'critical'
    if (errorsLastFiveMinutes >= 20) return 'warning'
    return 'healthy'
  }
}

// Global error monitor instance
export const errorMonitor = new ErrorMonitor()

// Setup global error handlers
export function setupGlobalErrorHandlers (): void {
  process.on('uncaughtException', (error) => {
    errorMonitor.logError(error, 'UNCAUGHT_EXCEPTION')
  })

  process.on('unhandledRejection', (reason, promise) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    errorMonitor.logError(error, 'UNHANDLED_REJECTION', { promise })
  })
}
