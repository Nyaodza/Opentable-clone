/**
 * API Versioning Middleware
 * Supports URL-based, header-based, and query parameter versioning
 */

import { Request, Response, NextFunction, Router } from 'express';

/**
 * Supported API versions
 */
export const API_VERSIONS = {
  V1: '1',
  V2: '2',
  CURRENT: '1',
  DEFAULT: '1',
  DEPRECATED: [''],
  SUPPORTED: ['1', '2'],
} as const;

export type ApiVersion = typeof API_VERSIONS.SUPPORTED[number];

/**
 * Version deprecation info
 */
interface VersionInfo {
  version: string;
  deprecated: boolean;
  deprecationDate?: string;
  sunsetDate?: string;
  message?: string;
}

const VERSION_INFO: Record<string, VersionInfo> = {
  '1': {
    version: '1',
    deprecated: false,
  },
  '2': {
    version: '2',
    deprecated: false,
  },
};

/**
 * Extend Express Request to include API version
 */
declare global {
  namespace Express {
    interface Request {
      apiVersion: string;
      apiVersionInfo: VersionInfo;
    }
  }
}

/**
 * Extract API version from request
 * Priority: URL path > Header > Query param > Default
 */
export function extractVersion(req: Request): string {
  // 1. Check URL path (e.g., /api/v1/restaurants)
  const pathMatch = req.path.match(/^\/api\/v(\d+)/);
  if (pathMatch) {
    return pathMatch[1];
  }

  // 2. Check custom header (X-API-Version or Accept-Version)
  const headerVersion = 
    req.headers['x-api-version'] as string ||
    req.headers['accept-version'] as string;
  if (headerVersion) {
    // Handle format like "v1" or "1"
    const match = headerVersion.match(/^v?(\d+)$/);
    if (match) {
      return match[1];
    }
  }

  // 3. Check Accept header for versioned media type
  // e.g., Accept: application/vnd.opentable.v1+json
  const acceptHeader = req.headers['accept'] as string;
  if (acceptHeader) {
    const mediaTypeMatch = acceptHeader.match(/application\/vnd\.opentable\.v(\d+)\+json/);
    if (mediaTypeMatch) {
      return mediaTypeMatch[1];
    }
  }

  // 4. Check query parameter
  if (req.query.version) {
    const queryVersion = req.query.version as string;
    const match = queryVersion.match(/^v?(\d+)$/);
    if (match) {
      return match[1];
    }
  }

  // 5. Default version
  return API_VERSIONS.DEFAULT;
}

/**
 * Validate API version
 */
export function isValidVersion(version: string): boolean {
  return API_VERSIONS.SUPPORTED.includes(version as ApiVersion);
}

/**
 * Get version info
 */
export function getVersionInfo(version: string): VersionInfo {
  return VERSION_INFO[version] || {
    version,
    deprecated: true,
    message: `API version ${version} is not supported`,
  };
}

/**
 * API Versioning Middleware
 * Attaches version info to request and adds deprecation headers
 */
export function apiVersioningMiddleware(req: Request, res: Response, next: NextFunction): void {
  const version = extractVersion(req);
  
  // Validate version
  if (!isValidVersion(version)) {
    res.status(400).json({
      error: 'Invalid API Version',
      message: `API version '${version}' is not supported. Supported versions: ${API_VERSIONS.SUPPORTED.join(', ')}`,
      supportedVersions: API_VERSIONS.SUPPORTED,
      currentVersion: API_VERSIONS.CURRENT,
    });
    return;
  }

  // Get version info
  const versionInfo = getVersionInfo(version);
  
  // Attach to request
  req.apiVersion = version;
  req.apiVersionInfo = versionInfo;

  // Add version response headers
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Current-Version', API_VERSIONS.CURRENT);

  // Add deprecation headers if applicable
  if (versionInfo.deprecated) {
    res.setHeader('Deprecation', versionInfo.deprecationDate || 'true');
    res.setHeader('X-API-Deprecated', 'true');
    res.setHeader('X-API-Deprecation-Info', versionInfo.message || 'This API version is deprecated');
    
    if (versionInfo.sunsetDate) {
      res.setHeader('Sunset', versionInfo.sunsetDate);
    }

    // Add Link header pointing to newer version
    const newVersionUrl = req.url.replace(/\/v\d+/, `/v${API_VERSIONS.CURRENT}`);
    res.setHeader('Link', `<${newVersionUrl}>; rel="successor-version"`);
  }

  next();
}

/**
 * Version-specific route handler wrapper
 * Allows different implementations for different API versions
 */
export function versionedHandler(
  handlers: Partial<Record<ApiVersion, (req: Request, res: Response, next: NextFunction) => void>>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = req.apiVersion as ApiVersion;
    const handler = handlers[version] || handlers[API_VERSIONS.DEFAULT as ApiVersion];

    if (!handler) {
      res.status(501).json({
        error: 'Not Implemented',
        message: `This endpoint is not available in API version ${version}`,
      });
      return;
    }

    handler(req, res, next);
  };
}

/**
 * Create versioned router
 * Automatically prefixes routes with version
 */
export function createVersionedRouter(version: ApiVersion = API_VERSIONS.DEFAULT as ApiVersion): Router {
  const router = Router();
  
  // Add version check middleware
  router.use((req, res, next) => {
    if (req.apiVersion !== version) {
      // This shouldn't happen if routing is correct, but just in case
      return res.status(400).json({
        error: 'Version Mismatch',
        message: `This endpoint requires API version ${version}`,
      });
    }
    next();
  });

  return router;
}

/**
 * API version guard - require specific version
 */
export function requireVersion(requiredVersion: ApiVersion) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.apiVersion !== requiredVersion) {
      res.status(400).json({
        error: 'Version Required',
        message: `This endpoint requires API version ${requiredVersion}. You requested version ${req.apiVersion}.`,
      });
      return;
    }
    next();
  };
}

/**
 * API version guard - require minimum version
 */
export function requireMinVersion(minVersion: ApiVersion) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentVersionNum = parseInt(req.apiVersion, 10);
    const minVersionNum = parseInt(minVersion, 10);

    if (currentVersionNum < minVersionNum) {
      res.status(400).json({
        error: 'Version Too Old',
        message: `This endpoint requires API version ${minVersion} or higher. You requested version ${req.apiVersion}.`,
        minimumVersion: minVersion,
        currentVersion: req.apiVersion,
      });
      return;
    }
    next();
  };
}

/**
 * Log version usage for analytics
 */
export function logVersionUsage(req: Request, res: Response, next: NextFunction): void {
  // In production, this would send to an analytics service
  const usage = {
    version: req.apiVersion,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.headers['user-agent'],
    deprecated: req.apiVersionInfo?.deprecated || false,
  };

  // Log for debugging (replace with proper analytics in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Version Usage]', JSON.stringify(usage));
  }

  next();
}

/**
 * Apply versioning to all routes under /api
 * This sets up the versioning infrastructure
 */
export function applyApiVersioning(app: Router): void {
  // Apply to all /api routes
  app.use('/api', apiVersioningMiddleware);
  
  // Optionally log version usage
  if (process.env.LOG_API_VERSION_USAGE === 'true') {
    app.use('/api', logVersionUsage);
  }
}

/**
 * Helper to get available versions info
 * Useful for API documentation endpoints
 */
export function getAvailableVersions(): {
  current: string;
  supported: readonly string[];
  deprecated: readonly string[];
  versions: VersionInfo[];
} {
  return {
    current: API_VERSIONS.CURRENT,
    supported: API_VERSIONS.SUPPORTED,
    deprecated: API_VERSIONS.DEPRECATED,
    versions: Object.values(VERSION_INFO),
  };
}

export default apiVersioningMiddleware;

