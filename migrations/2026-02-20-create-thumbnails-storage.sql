-- ============================================================
-- Supabase Storage: thumbnails 버킷 생성 + RLS 정책
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================================

-- 1. 버킷 생성 (public 버킷: 업로드된 이미지를 누구나 URL로 접근 가능)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,                                    -- public 버킷
  5242880,                                 -- 5MB 제한
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS 정책: 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload thumbnails"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'thumbnails');

-- 3. RLS 정책: 업로드한 본인만 삭제 가능
CREATE POLICY "Owner can delete own thumbnails"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'thumbnails' AND auth.uid() = owner);

-- 4. RLS 정책: 누구나 조회 가능 (public 버킷이므로)
CREATE POLICY "Anyone can view thumbnails"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'thumbnails');

-- ============================================================
-- 실행 후 확인:
-- Storage > Buckets에 'thumbnails' 버킷이 생성되어 있어야 함
-- ============================================================
