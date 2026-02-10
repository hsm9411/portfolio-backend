import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 선택적 JWT 인증 Guard
 * 
 * - 토큰이 있으면 검증하여 user 주입
 * - 토큰이 없으면 그냥 통과 (user는 undefined)
 * 
 * 사용처: 댓글 조회 (로그인 시 익명 마스킹 해제)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // 에러가 있거나 user가 없어도 통과
    return user;
  }
}
