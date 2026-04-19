# Migrations

이 폴더의 파일들은 실행 이력 보존용. 신규 DB 세팅에는 사용하지 않음.

## 신규 DB 세팅

루트의 `schema.sql` 하나만 Supabase SQL Editor에서 실행하면 됨.
단, 아래 마이그레이션 중 schema.sql에 통합되지 않은 것은 별도 실행 필요.

## 실행 이력

| 파일 | 날짜 | 내용 | schema.sql 반영 |
|------|------|------|------|
| 2026-02-09-add-supabase-oauth.sql | 2026-02-09 | users 테이블에 supabase_user_id 컬럼 추가 | ✅ 통합됨 |
| 2026-02-20-create-thumbnails-storage.sql | 2026-02-20 | Supabase Storage thumbnails 버킷 생성 | ❌ 별도 실행 필요 (Storage 설정) |
| 2026-04-17-add-comment-avatar-and-project-comment-count.sql | 2026-04-17 | comments.author_avatar_url 컬럼 추가, projects.comment_count 컬럼 추가 | ✅ 통합됨 |
| 2026-04-19-add-comment-is-anonymous.sql | 2026-04-19 | comments.is_anonymous 컬럼 추가 | ✅ 통합됨 |

## 주의

- `2026-02-20-create-thumbnails-storage.sql`: Supabase Storage 버킷 설정이라 schema.sql과 별개. 썸네일 업로드 기능 필요 시 별도 실행.
