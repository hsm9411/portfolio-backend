import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Post } from '../../entities/post';
import { Project } from '../../entities/project';

export enum ViewTargetType {
  POST = 'post',
  PROJECT = 'project',
}

/**
 * Redis 기반 조회수 관리 서비스
 * 
 * 전략:
 * 1. IP + TargetID를 Key로 Redis에 저장 (TTL 24시간)
 * 2. 중복 방지: 같은 IP는 24시간 내 1회만 카운트
 * 3. Write-Back: Redis에 카운트를 모았다가 주기적으로 DB 동기화
 * 
 * Redis Key 구조:
 * - view:count:{type}:{id} - 누적 조회수 (아직 DB에 반영 안 된)
 * - view:ip:{type}:{id}:{ip} - IP 중복 체크 (TTL 24h)
 */
@Injectable()
export class ViewCountService {
  private readonly logger = new Logger(ViewCountService.name);
  private readonly VIEW_IP_TTL = 24 * 60 * 60; // 24시간 (초 단위)
  private readonly VIEW_COUNT_PREFIX = 'view:count';
  private readonly VIEW_IP_PREFIX = 'view:ip';

  // 조회수 동기화가 필요한 대상을 추적
  private readonly trackedTargets = new Set<string>(); // 'post:uuid' or 'project:uuid'

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
  ) {}

  /**
   * 조회수 증가 (IP 기반 중복 방지)
   * 
   * @param type - 대상 타입 (post/project)
   * @param targetId - 대상 ID
   * @param ip - 클라이언트 IP
   * @returns 조회수 증가 여부
   */
  async incrementView(
    type: ViewTargetType,
    targetId: string,
    ip: string,
  ): Promise<boolean> {
    const ipKey = this.getIpKey(type, targetId, ip);

    // IP 중복 체크
    const hasViewed = await this.cacheManager.get(ipKey);
    if (hasViewed) {
      return false; // 이미 조회한 IP
    }

    // IP 기록 (24시간 TTL)
    await this.cacheManager.set(ipKey, '1', this.VIEW_IP_TTL * 1000);

    // Redis 카운트 증가
    const countKey = this.getCountKey(type, targetId);
    const currentCount = (await this.cacheManager.get<number>(countKey)) || 0;
    await this.cacheManager.set(countKey, currentCount + 1, 0); // TTL 없음 (명시적 삭제까지 유지)

    // 동기화 대상으로 등록
    this.trackedTargets.add(`${type}:${targetId}`);

    return true;
  }

  /**
   * 현재 조회수 조회 (DB + Redis 합산)
   */
  async getViewCount(type: ViewTargetType, targetId: string): Promise<number> {
    // DB에서 기본 조회수
    let dbCount = 0;
    if (type === ViewTargetType.POST) {
      const post = await this.postRepository.findOne({
        where: { id: targetId },
        select: ['viewCount'],
      });
      dbCount = post?.viewCount || 0;
    } else {
      const project = await this.projectRepository.findOne({
        where: { id: targetId },
        select: ['viewCount'],
      });
      dbCount = project?.viewCount || 0;
    }

    // Redis에서 아직 동기화 안 된 카운트
    const countKey = this.getCountKey(type, targetId);
    const redisCount = (await this.cacheManager.get<number>(countKey)) || 0;

    return dbCount + redisCount;
  }

  /**
   * [Cron] 매 30분마다 Redis → DB 동기화 (Write-Back)
   *
   * trackedTargets에 등록된 대상만 순회하므로 효율적
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncViewCountsToDB(): Promise<void> {
    if (this.trackedTargets.size === 0) {
      return;
    }

    this.logger.log(`[ViewCount Cron] ${this.trackedTargets.size}개 대상 DB 동기화 시작`);

    const targets = Array.from(this.trackedTargets);

    for (const target of targets) {
      try {
        const [type, id] = target.split(':') as [ViewTargetType, string];
        await this.syncSingleTarget(type, id);
        // 동기화 성공 시 추적 목록에서 제거
        this.trackedTargets.delete(target);
      } catch (error) {
        this.logger.error(`[ViewCount Cron] 동기화 실패: ${target}`, error);
        // 실패한 항목은 다음 사이클에 재시도
      }
    }

    this.logger.log('[ViewCount Cron] DB 동기화 완료');
  }

  /**
   * 특정 타겟의 Redis 카운트를 DB에 동기화
   */
  async syncSingleTarget(type: ViewTargetType, targetId: string): Promise<void> {
    const countKey = this.getCountKey(type, targetId);
    const redisCount = (await this.cacheManager.get<number>(countKey)) || 0;

    if (redisCount === 0) {
      return; // 동기화할 것 없음
    }

    // DB 업데이트
    if (type === ViewTargetType.POST) {
      await this.postRepository.increment({ id: targetId }, 'viewCount', redisCount);
    } else {
      await this.projectRepository.increment({ id: targetId }, 'viewCount', redisCount);
    }

    // Redis 카운트 초기화
    await this.cacheManager.del(countKey);

    console.log(`Synced ${redisCount} views for ${type}:${targetId} to DB`);
  }

  /**
   * Redis Key 생성 헬퍼
   */
  private getCountKey(type: ViewTargetType, targetId: string): string {
    return `${this.VIEW_COUNT_PREFIX}:${type}:${targetId}`;
  }

  private getIpKey(type: ViewTargetType, targetId: string, ip: string): string {
    return `${this.VIEW_IP_PREFIX}:${type}:${targetId}:${ip}`;
  }
}
