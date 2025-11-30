/**
 * Health Check Routes
 * Provides health, readiness, and liveness endpoints for monitoring
 */

import { Router, Request, Response } from 'express';
import { sequelize } from '../config/database';
import { redisClient } from '../config/redis';
import os from 'os';

const router = Router();

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'warning';
  latency?: number;
  message?: string;
}

interface HealthResponse {
  status: 'OK' | 'DEGRADED' | 'UNHEALTHY';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
    memory: HealthCheck;
    disk: HealthCheck;
  };
  metrics?: {
    memory: {
      total: string;
      used: string;
      free: string;
      percentage: number;
    };
    cpu: {
      loadAverage: number[];
      cores: number;
    };
    process: {
      pid: number;
      uptime: number;
      memoryUsage: NodeJS.MemoryUsage;
    };
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await sequelize.authenticate();
    const latency = Date.now() - start;
    
    // Check if latency is acceptable
    if (latency > 1000) {
      return { status: 'warning', latency, message: 'High latency detected' };
    }
    
    return { status: 'healthy', latency };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

/**
 * Check Redis connectivity
 */
async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    if (!redisClient) {
      return { status: 'unhealthy', message: 'Redis client not initialized' };
    }
    
    await redisClient.ping();
    const latency = Date.now() - start;
    
    if (latency > 100) {
      return { status: 'warning', latency, message: 'High Redis latency' };
    }
    
    return { status: 'healthy', latency };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      latency: Date.now() - start,
      message: error instanceof Error ? error.message : 'Redis connection failed'
    };
  }
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedPercent = ((totalMem - freeMem) / totalMem) * 100;
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (usedPercent > 95 || heapPercent > 95) {
    return { status: 'unhealthy', message: `Memory critical: ${usedPercent.toFixed(1)}% system, ${heapPercent.toFixed(1)}% heap` };
  }
  
  if (usedPercent > 85 || heapPercent > 85) {
    return { status: 'warning', message: `Memory high: ${usedPercent.toFixed(1)}% system, ${heapPercent.toFixed(1)}% heap` };
  }
  
  return { status: 'healthy' };
}

/**
 * Check disk usage (simplified)
 */
function checkDisk(): HealthCheck {
  // In a real implementation, you'd check actual disk usage
  // For now, we just return healthy as a placeholder
  return { status: 'healthy' };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

/**
 * GET /health
 * Comprehensive health check endpoint
 * Returns detailed health status of all system components
 */
router.get('/health', async (req: Request, res: Response) => {
  const includeMetrics = req.query.metrics === 'true';
  
  // Run all checks in parallel
  const [database, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  
  const memory = checkMemory();
  const disk = checkDisk();
  
  // Determine overall status
  const checks = { database, redis, memory, disk };
  const checkValues = Object.values(checks);
  
  let overallStatus: 'OK' | 'DEGRADED' | 'UNHEALTHY' = 'OK';
  
  if (checkValues.some(c => c.status === 'unhealthy')) {
    // If database is unhealthy, system is unhealthy
    if (database.status === 'unhealthy') {
      overallStatus = 'UNHEALTHY';
    } else {
      overallStatus = 'DEGRADED';
    }
  } else if (checkValues.some(c => c.status === 'warning' || c.status === 'degraded')) {
    overallStatus = 'DEGRADED';
  }
  
  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    checks,
  };
  
  // Add detailed metrics if requested
  if (includeMetrics) {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    response.metrics = {
      memory: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percentage: Math.round((usedMem / totalMem) * 100),
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length,
      },
      process: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    };
  }
  
  const statusCode = overallStatus === 'OK' ? 200 : overallStatus === 'DEGRADED' ? 200 : 503;
  res.status(statusCode).json(response);
});

/**
 * GET /health/ready
 * Kubernetes readiness probe
 * Returns 200 if the service is ready to accept traffic
 */
router.get('/health/ready', async (req: Request, res: Response) => {
  try {
    // Check critical dependencies
    const [dbCheck, redisCheck] = await Promise.all([
      checkDatabase(),
      checkRedis(),
    ]);
    
    // Service is ready only if database is healthy
    // Redis being down is acceptable for readiness (degraded mode)
    if (dbCheck.status === 'unhealthy') {
      return res.status(503).json({
        ready: false,
        reason: 'Database unavailable',
        checks: { database: dbCheck, redis: redisCheck },
      });
    }
    
    res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /health/live
 * Kubernetes liveness probe
 * Returns 200 if the process is running and responsive
 */
router.get('/health/live', (req: Request, res: Response) => {
  // Simple liveness check - if we can respond, we're alive
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
  });
});

/**
 * GET /health/startup
 * Kubernetes startup probe
 * Returns 200 once the service has completed initialization
 */
let startupComplete = false;

export function markStartupComplete() {
  startupComplete = true;
}

router.get('/health/startup', (req: Request, res: Response) => {
  if (startupComplete) {
    return res.status(200).json({
      started: true,
      timestamp: new Date().toISOString(),
    });
  }
  
  res.status(503).json({
    started: false,
    message: 'Service still initializing',
  });
});

/**
 * GET /health/dependencies
 * Detailed dependency health check
 */
router.get('/health/dependencies', async (req: Request, res: Response) => {
  const dependencies: Record<string, HealthCheck & { required: boolean }> = {};
  
  // Database (required)
  dependencies.postgres = { ...await checkDatabase(), required: true };
  
  // Redis (optional but important)
  dependencies.redis = { ...await checkRedis(), required: false };
  
  // Add more dependencies as needed
  // dependencies.elasticsearch = { ...await checkElasticsearch(), required: false };
  // dependencies.stripe = { ...await checkStripe(), required: true };
  
  const requiredHealthy = Object.entries(dependencies)
    .filter(([_, dep]) => dep.required)
    .every(([_, dep]) => dep.status === 'healthy' || dep.status === 'warning');
  
  const optionalHealthy = Object.entries(dependencies)
    .filter(([_, dep]) => !dep.required)
    .every(([_, dep]) => dep.status === 'healthy' || dep.status === 'warning');
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (!requiredHealthy) {
    status = 'unhealthy';
  } else if (!optionalHealthy) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  res.status(status === 'unhealthy' ? 503 : 200).json({
    status,
    timestamp: new Date().toISOString(),
    dependencies,
  });
});

/**
 * GET /metrics
 * Prometheus-compatible metrics endpoint
 */
router.get('/metrics', async (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Format as Prometheus metrics
  const metrics = `
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total ${cpuUsage.user / 1e6}

# HELP process_cpu_system_seconds_total Total system CPU time spent in seconds.
# TYPE process_cpu_system_seconds_total counter
process_cpu_system_seconds_total ${cpuUsage.system / 1e6}

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${memUsage.rss}

# HELP process_heap_bytes Process heap size in bytes.
# TYPE process_heap_bytes gauge
process_heap_bytes{type="total"} ${memUsage.heapTotal}
process_heap_bytes{type="used"} ${memUsage.heapUsed}

# HELP process_external_memory_bytes External memory size in bytes.
# TYPE process_external_memory_bytes gauge
process_external_memory_bytes ${memUsage.external}

# HELP process_start_time_seconds Start time of the process since unix epoch in seconds.
# TYPE process_start_time_seconds gauge
process_start_time_seconds ${Math.floor(Date.now() / 1000 - process.uptime())}

# HELP process_uptime_seconds The number of seconds the process has been running.
# TYPE process_uptime_seconds gauge
process_uptime_seconds ${process.uptime()}

# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0

# HELP nodejs_active_handles Number of active handles.
# TYPE nodejs_active_handles gauge
nodejs_active_handles ${(process as any)._getActiveHandles?.()?.length || 0}

# HELP nodejs_active_requests Number of active requests.
# TYPE nodejs_active_requests gauge
nodejs_active_requests ${(process as any)._getActiveRequests?.()?.length || 0}

# HELP system_memory_bytes System memory in bytes.
# TYPE system_memory_bytes gauge
system_memory_bytes{type="total"} ${os.totalmem()}
system_memory_bytes{type="free"} ${os.freemem()}

# HELP system_cpu_cores Number of CPU cores.
# TYPE system_cpu_cores gauge
system_cpu_cores ${os.cpus().length}

# HELP system_load_average System load average.
# TYPE system_load_average gauge
system_load_average{period="1m"} ${os.loadavg()[0]}
system_load_average{period="5m"} ${os.loadavg()[1]}
system_load_average{period="15m"} ${os.loadavg()[2]}
`.trim();

  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metrics);
});

export default router;

