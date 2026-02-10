# Database Migrations

## Posts Tags GIN Index

Posts 테이블의 `tags` 컬럼에 GIN 인덱스를 생성하여 배열 검색 성능을 최적화합니다.

### Supabase SQL Editor에서 실행

```sql
-- Posts tags GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);

-- 인덱스 확인
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'posts';
```

### 효과

- 태그 검색 쿼리 성능 대폭 향상
- `WHERE tags && ARRAY['NestJS', 'TypeScript']` 같은 배열 연산 최적화
