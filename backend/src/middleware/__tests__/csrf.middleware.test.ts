import { Request, Response, NextFunction } from 'express';
import { verifyCsrfToken, generateCsrfToken, getCsrfToken } from '../csrf.middleware';
import { mockRequest, mockResponse, mockNext } from '../../utils/test-helpers';

describe('CSRF Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = mockRequest({ ip: '127.0.0.1' });
    res = mockResponse();
    next = mockNext;
    jest.clearAllMocks();
  });

  describe('generateCsrfToken', () => {
    it('should generate and attach CSRF token', () => {
      req = mockRequest({ ip: '127.0.0.1' });
      
      generateCsrfToken(req as Request, res as Response, next);

      expect(res.locals?.csrfToken).toBeDefined();
      expect(typeof res.locals?.csrfToken).toBe('string');
      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should handle missing session gracefully', () => {
      req = mockRequest({ ip: undefined });
      
      generateCsrfToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('verifyCsrfToken', () => {
    it('should skip verification for GET requests', () => {
      req.method = 'GET';
      
      verifyCsrfToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip verification for Bearer token auth', () => {
      req.method = 'POST';
      req.headers = { authorization: 'Bearer token123' };
      
      verifyCsrfToken(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should fail without CSRF token', () => {
      req = mockRequest({ method: 'POST', ip: '127.0.0.1' });
      
      verifyCsrfToken(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'CSRF validation failed',
        message: expect.any(String),
      });
    });
  });

  describe('getCsrfToken', () => {
    it('should return CSRF token', () => {
      req = mockRequest({ ip: '127.0.0.1' });
      
      getCsrfToken(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        csrfToken: expect.any(String),
      });
    });

    it('should handle missing session', () => {
      req = mockRequest({ ip: undefined });
      
      getCsrfToken(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot generate CSRF token',
        message: 'Session not found',
      });
    });
  });
});
