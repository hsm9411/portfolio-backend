# Migrations

이 폴더의 파일들은 실행 이력 보존용이야. 신규 DB 세팅에는 사용하지 않음.

## 신규 DB 세팅

루트의 `schema.sql` 하나만 Supabase SQL Editor에서 실행하면 됨.
모든 마이그레이션 내용이 통합되어 있음.

## 실행 이력

| 파일 | 날짜 | 내용 | 상태 |
|------|------|------|------|
| 2026-02-09-add-supabase-oauth.sql | 2026-02-09 | users 테이블에 supabase_user_id 컬럼 추가 | schema.sql에 통합 |
| 2026-02-20-create-thumbnails-storage.sql | 2026-02-20 | Supabase Storage thumbnails 버킷 생성 | Storage 설정이므로 별도 실행 필요 |

## 주의

`2026-02-20-create-thumbnails-storage.sql`은 schema.sql에 포함되지 않음.
Supabase Storage 버킷 설정이라 schema와 별개로 관리됨.
썸네일 업로드 기능이 필요하면 해당 파일을 별도로 실행.
