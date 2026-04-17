## 관련 이슈

closes #

---

## 변경 사항

> 어떤 변경을 했는지 간결하게 설명해 주세요.

### 변경 유형

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor
- [ ] Docs
- [ ] Test
- [ ] Chore / Infra

### 변경 내용 요약

-
-

---

## 구현 세부사항

> 핵심 로직이나 설계 결정사항이 있으면 설명해 주세요. (선택)

---

## 테스트

- [ ] 로컬에서 `npm run test` 통과
- [ ] 관련 API 수동 테스트 완료 (Swagger 또는 curl)
- [ ] develop 브랜치 배포 후 dev 환경에서 확인

### 테스트 시나리오

```
# 예시
curl -X POST https://hsm9411-dev.duckdns.org/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"..."}'
```

---

## 체크리스트

- [ ] 코드 리뷰 셀프 체크 완료
- [ ] 불필요한 `console.log` 제거
- [ ] 환경변수 노출 없음 (`.env` 파일 미포함)
- [ ] Swagger 문서 업데이트 (API 변경 시)
- [ ] DB 스키마 변경 시 `docs/schema.sql` 업데이트

---

## 스크린샷 / 로그 (선택)

> API 응답, Swagger UI, 에러 로그 등 참고 자료가 있으면 첨부해 주세요.
