import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../entities/user';

/**
 * CurrentUser Decorator
 * 
 * JWT Guard를 통과한 요청에서 user 객체를 추출합니다.
 * 
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
