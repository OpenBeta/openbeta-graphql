/**
 * Circuit breaker pattern implementation for handling network failures
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerOptions {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount: number = 0
  private lastFailureTime?: number
  private successCount: number = 0

  constructor (
    private readonly options: CircuitBreakerOptions = {
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      monitoringPeriod: 10000 // 10 seconds
    }
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
      } else {
        throw new Error('Circuit breaker is OPEN - operation not allowed')
      }
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess (): void {
    this.failureCount = 0
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED
    }
    this.successCount++
  }

  private onFailure (): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN
    }
  }

  private shouldAttemptReset (): boolean {
    return (
      this.lastFailureTime != null &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    )
  }

  getState (): CircuitState {
    return this.state
  }

  getStats (): { state: CircuitState, failureCount: number, successCount: number, lastFailureTime?: number } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    }
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T> (
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      if (attempt === maxRetries) {
        break
      }

      const delay = Math.min(
        initialDelay * Math.pow(2, attempt - 1),
        maxDelay
      )

      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError ?? new Error('Operation failed after all retry attempts')
}
