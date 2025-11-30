/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are down
 */

import { EventEmitter } from 'events';
import { logInfo, logError, logWarn } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Failing, reject all requests
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

export interface CircuitBreakerOptions {
  name: string;
  failureThreshold?: number;      // Number of failures before opening
  successThreshold?: number;      // Number of successes to close from half-open
  timeout?: number;               // Time in ms before trying again (half-open)
  resetTimeout?: number;          // Time to reset failure count when closed
  monitorInterval?: number;       // Health check interval
  fallback?: (...args: any[]) => Promise<any>;  // Fallback function
  isFailure?: (error: any) => boolean;  // Custom failure detection
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onSuccess?: (duration: number) => void;
  onFailure?: (error: Error) => void;
}

interface CircuitStats {
  failures: number;
  successes: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  totalRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  averageResponseTime: number;
  responseTimes: number[];
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitStats;
  private readonly options: Required<CircuitBreakerOptions>;
  private stateTimer?: NodeJS.Timeout;
  private readonly maxResponseTimesSamples = 100;

  constructor(options: CircuitBreakerOptions) {
    super();
    
    this.options = {
      name: options.name,
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 30000,
      resetTimeout: options.resetTimeout ?? 60000,
      monitorInterval: options.monitorInterval ?? 5000,
      fallback: options.fallback ?? (async () => { throw new Error('Circuit is open'); }),
      isFailure: options.isFailure ?? (() => true),
      onStateChange: options.onStateChange ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
      onFailure: options.onFailure ?? (() => {}),
    };

    this.stats = this.createInitialStats();
    
    logInfo(`Circuit breaker "${this.options.name}" initialized`);
  }

  private createInitialStats(): CircuitStats {
    return {
      failures: 0,
      successes: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      totalRequests: 0,
      averageResponseTime: 0,
      responseTimes: [],
    };
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      logWarn(`Circuit "${this.options.name}" is OPEN, using fallback`);
      this.emit('rejected');
      return this.options.fallback() as Promise<T>;
    }

    const startTime = Date.now();

    try {
      const result = await fn();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error as Error, Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Wrap a function to use circuit breaker
   */
  wrap<T extends (...args: any[]) => Promise<any>>(fn: T): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return this.execute(() => fn(...args));
    }) as T;
  }

  private onSuccess(duration: number): void {
    this.stats.successes++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
    this.stats.lastSuccessTime = new Date();
    this.updateResponseTime(duration);

    this.options.onSuccess(duration);
    this.emit('success', { duration });

    if (this.state === CircuitState.HALF_OPEN) {
      if (this.stats.consecutiveSuccesses >= this.options.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
      }
    }
  }

  private onFailure(error: Error, duration: number): void {
    // Check if this error should be counted as a failure
    if (!this.options.isFailure(error)) {
      return;
    }

    this.stats.failures++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.lastFailureTime = new Date();
    this.updateResponseTime(duration);

    this.options.onFailure(error);
    this.emit('failure', { error, duration });

    logError(`Circuit "${this.options.name}" failure: ${error.message}`);

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open goes back to open
      this.transitionTo(CircuitState.OPEN);
    } else if (this.state === CircuitState.CLOSED) {
      if (this.stats.consecutiveFailures >= this.options.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    logInfo(`Circuit "${this.options.name}" transitioned: ${oldState} -> ${newState}`);

    // Clear any existing timer
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = undefined;
    }

    // Set up state-specific timers
    if (newState === CircuitState.OPEN) {
      // After timeout, try half-open
      this.stateTimer = setTimeout(() => {
        this.transitionTo(CircuitState.HALF_OPEN);
      }, this.options.timeout);
    } else if (newState === CircuitState.CLOSED) {
      // Reset stats when closing
      this.stats.consecutiveFailures = 0;
      this.stats.consecutiveSuccesses = 0;
    }

    this.options.onStateChange(oldState, newState);
    this.emit('stateChange', { from: oldState, to: newState });
  }

  private updateResponseTime(duration: number): void {
    this.stats.responseTimes.push(duration);
    
    // Keep only the last N samples
    if (this.stats.responseTimes.length > this.maxResponseTimesSamples) {
      this.stats.responseTimes.shift();
    }

    // Calculate average
    const sum = this.stats.responseTimes.reduce((a, b) => a + b, 0);
    this.stats.averageResponseTime = sum / this.stats.responseTimes.length;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats & { state: CircuitState; name: string } {
    return {
      ...this.stats,
      state: this.state,
      name: this.options.name,
    };
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.transitionTo(CircuitState.OPEN);
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.transitionTo(CircuitState.CLOSED);
  }

  /**
   * Reset the circuit to initial state
   */
  reset(): void {
    if (this.stateTimer) {
      clearTimeout(this.stateTimer);
      this.stateTimer = undefined;
    }
    this.stats = this.createInitialStats();
    this.state = CircuitState.CLOSED;
    this.emit('reset');
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    return this.state !== CircuitState.OPEN;
  }
}

/**
 * Circuit Breaker Registry - manages multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private breakers: Map<string, CircuitBreaker> = new Map();

  static getInstance(): CircuitBreakerRegistry {
    if (!this.instance) {
      this.instance = new CircuitBreakerRegistry();
    }
    return this.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  getBreaker(options: CircuitBreakerOptions): CircuitBreaker {
    let breaker = this.breakers.get(options.name);
    
    if (!breaker) {
      breaker = new CircuitBreaker(options);
      this.breakers.set(options.name, breaker);
    }
    
    return breaker;
  }

  /**
   * Get all circuit breaker stats
   */
  getAllStats(): Array<ReturnType<CircuitBreaker['getStats']>> {
    return Array.from(this.breakers.values()).map(b => b.getStats());
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(b => b.reset());
  }

  /**
   * Get breaker by name
   */
  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }
}

/**
 * Decorator for class methods to use circuit breaker
 */
export function WithCircuitBreaker(options: Omit<CircuitBreakerOptions, 'name'>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const breakerName = `${target.constructor.name}.${propertyKey}`;
    
    const registry = CircuitBreakerRegistry.getInstance();
    const breaker = registry.getBreaker({ ...options, name: breakerName });

    descriptor.value = async function (...args: any[]) {
      return breaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Pre-configured circuit breakers for common services
 */
export const ServiceCircuitBreakers = {
  stripe: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'stripe-api',
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 30000,
    isFailure: (error) => {
      // Don't count validation errors as failures
      if (error.type === 'StripeCardError') return false;
      if (error.type === 'StripeInvalidRequestError') return false;
      return true;
    },
  }),

  twilio: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'twilio-api',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),

  sendgrid: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'sendgrid-api',
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
  }),

  openai: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'openai-api',
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 120000, // OpenAI can be slow
  }),

  database: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'database',
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 10000,
  }),

  redis: () => CircuitBreakerRegistry.getInstance().getBreaker({
    name: 'redis',
    failureThreshold: 5,
    successThreshold: 1,
    timeout: 5000,
  }),
};

export default CircuitBreaker;

