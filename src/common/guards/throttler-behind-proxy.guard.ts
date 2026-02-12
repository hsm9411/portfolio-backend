import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

/**
 * Cloudflare Proxy 환경에서 실제 사용자 IP를 추출하는 Throttler Guard
 *
 * Cloudflare는 다음 헤더들을 제공:
 * - CF-Connecting-IP: 실제 클라이언트 IP (가장 신뢰 가능)
 * - X-Forwarded-For: 프록시 체인의 IP 목록
 * - X-Real-IP: 원본 IP
 *
 * 우선순위: CF-Connecting-IP > X-Real-IP > X-Forwarded-For > req.ip
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Cloudflare가 제공하는 실제 IP 헤더
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
      return cfConnectingIp as string;
    }

    // X-Real-IP (일반 프록시)
    const xRealIp = req.headers['x-real-ip'];
    if (xRealIp) {
      return xRealIp as string;
    }

    // X-Forwarded-For (첫 번째 IP = 원본 클라이언트)
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
      const ips = (xForwardedFor as string).split(',');
      return ips[0].trim();
    }

    // 기본값: Express req.ip (trust proxy 설정 필요)
    return req.ip || req.connection.remoteAddress || 'unknown';
  }
}
