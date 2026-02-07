import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Guard
 *
 * 로그인한 사용자는 인증 처리하고,
 * 로그인하지 않은 사용자(익명)도 허용합니다.
 *
 * 사용 예시: 좋아요, 댓글 (로그인/익명 모두 가능)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // 에러가 있거나 사용자가 없어도 null 반환 (에러 던지지 않음)
    if (err || !user) {
      return null;
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    // 항상 true를 반환하여 요청을 허용
    return super.canActivate(context) as Promise<boolean> | boolean;
  }
}
