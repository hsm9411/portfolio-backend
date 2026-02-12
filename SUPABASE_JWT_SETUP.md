# 🔐 Supabase JWT Secret 설정 가이드

## ❌ 현재 문제

```
POST /api/projects → 401 Unauthorized
```

**원인**: 백엔드가 Supabase JWT를 검증할 수 없음
**해결**: Supabase JWT Secret을 백엔드에 설정

---

## 🔍 Step 1: Supabase JWT Secret 찾기

### Supabase Dashboard 접속
```
1. https://supabase.com/dashboard 접속
2. 프로젝트 선택: vcegupzlmopajpqxttfo
3. 좌측 메뉴: Settings (톱니바퀴 아이콘)
4. API 클릭
```

### JWT Secret 복사
```
페이지 중간에 "JWT Settings" 섹션:

┌─────────────────────────────────────┐
│ JWT Settings                        │
├─────────────────────────────────────┤
│ JWT Secret                          │
│ [매우 긴 문자열... 복사 버튼]        │
└─────────────────────────────────────┘

→ 복사 버튼 클릭
```

**중요**: 
- JWT Secret은 매우 긴 문자열입니다 (200자 이상)
- 이것이 **Supabase가 발급한 JWT를 검증하는 키**입니다

---

## 🔧 Step 2: 백엔드 .env 파일 업데이트

### 파일 위치
```
C:\hsm9411\portfolio-backend\.env
```

### 수정할 부분

**기존**:
```env
JWT_SECRET=portfolio_jwt_secret_key_2026_hsm9411_super_secure_random_string
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

**수정 후** (Supabase에서 복사한 JWT Secret 붙여넣기):
```env
JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...매우긴문자열...
SUPABASE_JWT_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...매우긴문자열...
```

**중요**: `JWT_SECRET`과 `SUPABASE_JWT_SECRET` 둘 다 같은 값으로 설정!

---

## 🚀 Step 3: 백엔드 재시작

### Oracle Cloud에서 실행 중이라면

**SSH 접속**:
```bash
ssh -i your-key.pem ubuntu@158.180.75.205
```

**백엔드 재시작**:
```bash
cd /home/ubuntu/portfolio-backend
pm2 restart portfolio-backend
```

**로그 확인**:
```bash
pm2 logs portfolio-backend
```

---

## ✅ Step 4: 테스트

### 프론트엔드에서 테스트
```
1. 로그인 상태 확인
2. /projects/new 접속
3. 프로젝트 작성 폼 작성
4. "작성하기" 클릭
5. ✅ 성공!
```

### 예상 로그 (브라우저 콘솔)
```
✅ JWT 토큰 추가됨: eyJhbGciOiJFUzI1NiIs...
[API Request] POST /projects { hasAuth: true }
[API Response] 201 /projects
```

---

## 🎯 JWT Secret 확인 방법

### Supabase Dashboard에서 확인
```
Settings → API → JWT Settings

형식:
- 매우 긴 문자열 (200자 이상)
- 점(.)으로 구분된 3개 파트 없음 (이건 JWT 토큰 형식)
- 순수한 랜덤 문자열
```

### 예시 (실제와 다름)
```
올바른 JWT Secret:
aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890...매우긴문자열...

잘못된 예 (JWT 토큰):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
```

---

## 🐛 문제 해결

### 여전히 401 에러
```
1. JWT_SECRET 값 재확인
2. 백엔드 재시작 확인
3. 백엔드 로그 확인:
   pm2 logs portfolio-backend
```

### 백엔드 로그에서 찾아볼 내용
```
에러 예시:
"invalid signature"
"jwt malformed"
"jwt expired"

→ JWT_SECRET이 틀렸거나 설정 안 됨
```

---

## 📋 체크리스트

배포 전 확인:

- [ ] Supabase Dashboard → Settings → API 접속
- [ ] JWT Secret 복사
- [ ] 백엔드 .env 파일 업데이트
- [ ] JWT_SECRET = (복사한 값)
- [ ] SUPABASE_JWT_SECRET = (복사한 값)
- [ ] 백엔드 재시작 (pm2 restart)
- [ ] 프론트엔드에서 프로젝트 작성 테스트

---

**작성일**: 2026-02-12
**목적**: Supabase JWT Secret 설정하여 401 에러 해결
