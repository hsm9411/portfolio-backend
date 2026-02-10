import type { Request } from 'express';

/**
 * Cloudflare Proxy 환경에서 실제 클라이언트 IP 추출
 * 
 * 우선순위:
 * 1. CF-Connecting-IP (Cloudflare가 제공하는 실제 IP)
 * 2. X-Real-IP
 * 3. X-Forwarded-For (첫 번째 IP)
 * 4. req.ip (Express의 기본값)
 */
export function getClientIp(req: Request): string {
  // Cloudflare
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
  }

  // X-Real-IP
  const xRealIp = req.headers['x-real-ip'];
  if (xRealIp) {
    return Array.isArray(xRealIp) ? xRealIp[0] : xRealIp;
  }

  // X-Forwarded-For
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const ips = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor).split(',');
    return ips[0].trim();
  }

  // 기본값
  return req.ip || req.socket.remoteAddress || 'unknown';
}
