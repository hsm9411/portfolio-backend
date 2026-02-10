import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ViewCountService } from '../common/services';

/**
 * 스케줄링 작업 관리
 * 
 * - Redis 조회수 → DB 동기화
 * - 기타 주기적 작업
 */
@Injectable()
export class TasksService {
  constructor(private readonly viewCountService: ViewCountService) {}

  /**
   * Redis 조회수를 DB에 동기화
   * 
   * 실행 주기: 매일 자정 (KST 00:00)
   * 
   * TODO: Redis SCAN으로 모든 view:count:* 키를 순회하여 동기화
   * 현재는 수동 구현 필요
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncViewCountsToDB() {
    console.log('[Cron] Starting view counts sync to DB...');

    try {
      // TODO: 실제 구현
      // 1. Redis에서 view:count:* 패턴의 모든 키 가져오기
      // 2. 각 키별로 syncSingleTarget() 호출
      // 3. 동기화 결과 로깅

      await this.viewCountService.syncViewCountsToDB();

      console.log('[Cron] View counts sync completed');
    } catch (error) {
      console.error('[Cron] View counts sync failed:', error);
    }
  }

  /**
   * 임시: 수동 동기화 테스트용
   * 
   * 실제 운영에서는 관리자 API로 제공하거나 제거
   */
  async manualSyncExample() {
    // 특정 Post 동기화
    await this.viewCountService.syncSingleTarget(
      'post' as any,
      'some-post-id',
    );

    // 특정 Project 동기화
    await this.viewCountService.syncSingleTarget(
      'project' as any,
      'some-project-id',
    );
  }
}
