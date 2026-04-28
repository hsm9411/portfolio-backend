# 서버 인프라 전체 구조 가이드

> 포트폴리오 백엔드 프로젝트의 서버 인프라를 처음부터 끝까지 설명합니다.
> SSH 키, 네트워크 방화벽, Docker, Nginx, HTTPS까지 — 각 구성요소가 **왜 필요한지**,
> **어디서 어떻게 동작하는지**를 요청 흐름을 따라가며 정리합니다.
>
> **최종 업데이트: 2026-04-28 — 2대 서버 분리 완료 (BACK-41)**

---

## 목차

1. [전체 구조 한눈에 보기](#1-전체-구조-한눈에-보기)
2. [서버 정보](#2-서버-정보)
3. [네트워크 보안 3계층](#3-네트워크-보안-3계층)
4. [SSH 키 인증](#4-ssh-키-인증)
5. [도메인과 DNS (DuckDNS)](#5-도메인과-dns-duckdns)
6. [HTTPS와 SSL/TLS 인증서](#6-https와-ssltls-인증서)
7. [Nginx의 역할](#7-nginx의-역할)
8. [Docker와 컨테이너 네트워크](#8-docker와-컨테이너-네트워크)
9. [CI/CD 배포 흐름](#9-cicd-배포-흐름)
10. [요청의 전체 흐름 (End-to-End)](#10-요청의-전체-흐름-end-to-end)
11. [서버 운영 가이드](#11-서버-운영-가이드)

---

## 1. 전체 구조 한눈에 보기

```
[사용자 브라우저]
      │
      ├── https://hsm9411.duckdns.org     (prod)
      │         │
      │         ▼
      │   ┌─────────────────────────────────┐
      │   │  Server 1 — Prod                │
      │   │  158.180.75.205                 │
      │   │                                 │
      │   │  [portfolio-nginx] :80/:443     │
      │   │       │                         │
      │   │       └→ [portfolio-backend]    │
      │   │              │                  │
      │   │         [portfolio-redis]       │
      │   └─────────────────────────────────┘
      │
      └── https://hsm9411-dev.duckdns.org  (dev)
                │
                ▼
          ┌─────────────────────────────────────────┐
          │  Server 2 — Dev + Monitoring (예정)      │
          │  152.67.216.145                          │
          │                                          │
          │  [portfolio-nginx] :80/:443              │
          │       │                                  │
          │       └→ [portfolio-backend-dev]         │
          │              │                           │
          │         [portfolio-redis-dev]            │
          │                                          │
          │  (미래) [prometheus] [grafana]           │
          └─────────────────────────────────────────┘
```

---

## 2. 서버 정보

### Server 1 — Production

| 항목 | 값 |
|---|---|
| 역할 | prod 서비스 (main 브랜치) |
| IP | 158.180.75.205 |
| 타입 | VM.Standard.E2.1.Micro (OCI Always Free) |
| 스펙 | 1 vCPU, 1GB RAM |
| OS | Ubuntu 24.04 |
| SSH 키 | `C:\Users\hasun\Desktop\portfolio\ssh-key-2026-02-07.key` |
| 디렉토리 | `~/portfolio-backend/` — compose 파일 + nginx conf/ssl |

### Server 2 — Development

| 항목 | 값 |
|---|---|
| 역할 | dev 서비스 (develop 브랜치) + 모니터링 예정 |
| IP | 152.67.216.145 |
| 타입 | VM.Standard.E2.1.Micro (OCI Always Free) |
| 스펙 | 1 vCPU, 1GB RAM + **Swap 2GB** |
| OS | Ubuntu (구 MSA 서버 전환) |
| SSH 키 | `C:\Users\hasun\Desktop\oracle\` 안의 별도 키파일 |
| 디렉토리 | `~/portfolio-backend/` — nginx, `~/portfolio-backend-dev/` — app |

### 두 서버 공통

- 같은 OCI VCN (Virtual Cloud Network) 안에 있어 사설 IP로 통신 가능
- UFW + OCI Security List: 22(SSH), 80(HTTP), 443(HTTPS)만 개방
- DuckDNS 갱신 cron 등록됨 (*/30 * * * *)

---

## 3. 네트워크 보안 3계층

외부에서 들어온 요청은 총 3개의 방화벽 계층을 통과해야 NestJS 앱에 닿습니다.

### 계층 1: OCI Security List (클라우드 방화벽)

VM에 물리적으로 도달하기 전에 클라우드 수준에서 필터링.

```
허용: 22 (SSH), 80 (HTTP), 443 (HTTPS)
차단: 3000(NestJS), 6379(Redis), 9090(Prometheus) 등 모두 차단
```

**설정 위치**: OCI 콘솔 → Networking → Virtual Cloud Networks → Security Lists

### 계층 2: UFW (OS 방화벽)

OCI Security List를 통과해도 VM 내부에서 한 번 더 필터링.

```bash
sudo ufw status verbose
# 22/tcp, 80/tcp, 443/tcp ALLOW — 나머지 전부 DENY
```

### 계층 3: Docker 네트워크 격리

```
[외부]
  │ 80, 443
  ▼
portfolio-nginx
  │ global-portfolio-network
  ▼
portfolio-backend (또는 portfolio-backend-dev)
  │ internal (bridge)
  ▼
portfolio-redis (외부 절대 접근 불가)
```

---

## 4. SSH 키 인증

### GitHub Actions CI/CD에서 SSH 사용 방식

```
GitHub Actions 러너
  │ 1. Secrets에서 개인키 꺼냄 (ORACLE_SSH_KEY_PROD / ORACLE_SSH_KEY_DEV)
  │ 2. ~/.ssh/id_rsa 로 임시 저장
  │ 3. SSH 접속
  ▼
서버 (authorized_keys에 공개키 등록됨)
  │ 서명 검증 성공
  ▼
배포 명령 실행
```

### GitHub Secrets 구성

| Secret | 값 | 용도 |
|---|---|---|
| `ORACLE_HOST_PROD` | 158.180.75.205 | prod 서버 SSH 대상 |
| `ORACLE_SSH_KEY_PROD` | Server 1 개인키 | prod 배포 |
| `ORACLE_HOST_DEV` | 152.67.216.145 | dev 서버 SSH 대상 |
| `ORACLE_SSH_KEY_DEV` | Server 2 개인키 | dev 배포 |
| `ORACLE_USER` | ubuntu | SSH 사용자명 (공통) |

---

## 5. 도메인과 DNS (DuckDNS)

```
hsm9411.duckdns.org     → 158.180.75.205  (Server 1, prod)
hsm9411-dev.duckdns.org → 152.67.216.145  (Server 2, dev)
```

DuckDNS는 무료 동적 DNS 서비스. OCI Free Tier IP는 고정이지만 만약을 대비해 30분마다 갱신 cron 등록.

**각 서버 cron 등록 내용:**

```cron
*/30 * * * * curl -s 'https://www.duckdns.org/update?domains=hsm9411[-dev]&token=TOKEN&ip=' > /dev/null 2>&1
```

---

## 6. HTTPS와 SSL/TLS 인증서

### 인증서 발급 (Let's Encrypt + certbot)

```bash
# 인증서 발급
sudo certbot certonly --standalone -d [도메인] --email [이메일] --agree-tos

# 발급된 인증서를 nginx 볼륨 경로로 복사
cp /etc/letsencrypt/live/[도메인]/fullchain.pem ~/portfolio-backend/nginx/ssl/[prod|dev]/
cp /etc/letsencrypt/live/[도메인]/privkey.pem   ~/portfolio-backend/nginx/ssl/[prod|dev]/
```

### 자동 갱신

certbot이 Ubuntu systemd 타이머로 자동 갱신 처리.
갱신 후 nginx에 자동 반영하도록 deploy hook 등록:

```bash
# /etc/letsencrypt/renewal-hooks/deploy/portfolio-[dev].sh
cp /etc/letsencrypt/live/[도메인]/fullchain.pem /home/ubuntu/portfolio-backend/nginx/ssl/[dev]/
cp /etc/letsencrypt/live/[도메인]/privkey.pem   /home/ubuntu/portfolio-backend/nginx/ssl/[dev]/
docker exec portfolio-nginx nginx -s reload
```

### 인증서 파일 위치 (서버별)

```
Server 1: ~/portfolio-backend/nginx/ssl/prod/fullchain.pem
                                              privkey.pem
Server 2: ~/portfolio-backend/nginx/ssl/dev/fullchain.pem
                                             privkey.pem
```

---

## 7. Nginx의 역할

```
[클라이언트]
  │ HTTPS 요청
  ▼
[Nginx]
  ① HTTP(80) → HTTPS(443) 리다이렉트
  ② SSL 종단 (TLS 복호화)
  ③ 보안 헤더 추가 (HSTS, X-Frame-Options 등)
  ④ 리버스 프록시 → NestJS 앱
  │
  ▼ HTTP (Docker 내부망)
[NestJS :3000]
```

### nginx conf 파일 구조

```
레포지토리 (소스)               서버 배포 후
nginx/conf.d/
├── portfolio-prod.conf    →   Server 1: ~/portfolio-backend/nginx/conf.d/portfolio.conf
└── portfolio-dev.conf     →   Server 2: ~/portfolio-backend/nginx/conf.d/portfolio.conf
```

CI/CD가 각 서버에 맞는 conf를 `portfolio.conf`로 복사해서 배포.

### Server 1 nginx (portfolio-prod.conf)

```nginx
server {
    listen 80;
    server_name hsm9411.duckdns.org;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name hsm9411.duckdns.org;
    ssl_certificate /etc/nginx/ssl/prod/fullchain.pem;
    # → portfolio-backend:3000
}
```

### Server 2 nginx (portfolio-dev.conf)

```nginx
server {
    listen 80;
    server_name hsm9411-dev.duckdns.org;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name hsm9411-dev.duckdns.org;
    ssl_certificate /etc/nginx/ssl/dev/fullchain.pem;
    # → portfolio-backend-dev:3000
}
```

---

## 8. Docker와 컨테이너 네트워크

### Server 1 (Prod)

| 컨테이너 | 이미지 | 포트 | 네트워크 |
|---|---|---|---|
| `portfolio-nginx` | nginx:1.25-alpine | 80:80, 443:443 | global |
| `portfolio-backend` | ghcr.io/…:latest | expose 3000 | internal + global |
| `portfolio-redis` | redis:7-alpine | expose 6379 | internal only |

### Server 2 (Dev)

| 컨테이너 | 이미지 | 포트 | 네트워크 |
|---|---|---|---|
| `portfolio-nginx` | nginx:1.25-alpine | 80:80, 443:443 | global |
| `portfolio-backend-dev` | ghcr.io/…:develop | expose 3000 | internal + global |
| `portfolio-redis-dev` | redis:7-alpine | expose 6379 | internal only |

### 네트워크 구성 (각 서버 독립)

```
global-portfolio-network (external): Nginx ↔ 백엔드 앱
internal (bridge):                   앱 ↔ Redis (외부 노출 없음)
```

### 서버 디렉토리 구조

```
Server 1:
~/portfolio-backend/
├── docker-compose.yml          ← prod app + redis
├── docker-compose.nginx.yml    ← nginx
├── deploy.sh
└── nginx/
    ├── conf.d/portfolio.conf   ← portfolio-prod.conf 내용
    ├── ssl/prod/               ← SSL 인증서
    └── logs/

Server 2:
~/portfolio-backend/
├── docker-compose.nginx.yml    ← nginx
└── nginx/
    ├── conf.d/portfolio.conf   ← portfolio-dev.conf 내용
    ├── ssl/dev/                ← SSL 인증서
    └── logs/
~/portfolio-backend-dev/
├── docker-compose.yml          ← dev app + redis (docker-compose.dev.yml 내용)
└── deploy.sh
```

---

## 9. CI/CD 배포 흐름

```
PR 오픈/업데이트
  └→ lint job만 실행 (build/deploy 없음)

push to develop
  └→ lint → build & push (:develop 태그) → deploy-dev (Server 2)

push to main
  └→ lint → build & push (:latest 태그) → deploy-prod (Server 1)
```

### deploy-prod (Server 1) 단계

1. SSH 접속 (`ORACLE_HOST_PROD` / `ORACLE_SSH_KEY_PROD`)
2. 디렉토리 생성, global-portfolio-network 생성
3. `docker-compose.yml`, `docker-compose.nginx.yml`, `portfolio-prod.conf` → `portfolio.conf` 복사
4. nginx reload (또는 최초 기동)
5. `deploy.sh` 실행 → `docker pull :latest` → app 재시작
6. 헬스체크 확인

### deploy-dev (Server 2) 단계

1. SSH 접속 (`ORACLE_HOST_DEV` / `ORACLE_SSH_KEY_DEV`)
2. 디렉토리 생성, global-portfolio-network 생성
3. `docker-compose.nginx.yml`, `portfolio-dev.conf` → `portfolio.conf` 복사
4. nginx reload (또는 최초 기동)
5. `docker-compose.dev.yml` → `~/portfolio-backend-dev/docker-compose.yml` 복사
6. `deploy.sh` 실행 → `docker pull :develop` → app 재시작
7. 헬스체크 확인

---

## 10. 요청의 전체 흐름 (End-to-End)

`https://hsm9411-dev.duckdns.org/posts` 요청 예시:

```
1. DNS: hsm9411-dev.duckdns.org → 152.67.216.145
2. OCI Security List: 443 허용 통과
3. UFW: 443 허용 통과
4. Docker: 443 → portfolio-nginx 컨테이너
5. Nginx TLS Handshake: ssl/dev/fullchain.pem 제시
6. Nginx: Host 헤더 확인 → portfolio-backend-dev:3000 으로 프록시
7. NestJS: JWT 검증, Redis 조회, Supabase DB 조회
8. 응답 역순 전달
```

---

## 11. 서버 운영 가이드

### 자주 쓰는 명령어

```bash
# 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs portfolio-backend-dev --tail=50 -f

# nginx 설정 검증
docker exec portfolio-nginx nginx -t

# nginx 무중단 재시작
docker exec portfolio-nginx nginx -s reload

# UFW 상태
sudo ufw status verbose

# DNS 확인
nslookup hsm9411-dev.duckdns.org

# 헬스체크
curl -sf https://hsm9411-dev.duckdns.org/health
```

### GitHub Actions 수동 트리거

```bash
# develop 브랜치 재배포
gh workflow run deploy.yml --ref develop

# main 브랜치 재배포
gh workflow run deploy.yml --ref main
```

또는 GitHub 웹: Actions → Deploy to Oracle Cloud → Run workflow

### 주의사항

- **배포는 반드시 CI/CD만** — 서버에 직접 docker 명령 실행 시 컨테이너 ID 불일치로 이후 CI/CD 실패
- **nginx 수동 재시작 금지** — `docker compose up` 직접 실행 금지. CI/CD 또는 `nginx -s reload`만
- **certbot 갱신** — systemd 타이머 자동 처리. deploy hook이 nginx ssl/dev 경로에 자동 복사

### 모니터링 연동 (예정: BACK-31)

두 서버가 같은 OCI VCN → Server 2의 Prometheus가 Server 1 사설 IP로 scrape 가능:

```bash
# Server 1 UFW에 Server 2 사설 IP → 3000 허용 추가 예정
sudo ufw allow from [Server2_사설IP] to any port 3000
```

---

## 2대 서버 분리 작업 이력 (2026-04-28)

### 진행한 작업

| 단계 | 내용 | 완료 |
|---|---|---|
| Phase 0 | board-supabase MSA 컨테이너 정리, OCI Security List 확인 | ✅ |
| Phase 1 | Server 2 Docker 설치, UFW 설정 | ✅ |
| Phase 2 | DuckDNS `hsm9411-dev` → Server 2 IP(152.67.216.145) 변경 | ✅ |
| Phase 3 | certbot SSL 인증서 발급 + deploy hook 등록 | ✅ |
| Phase 4 | Server 2 `.env` 파일 생성 (`portfolio_dev` 스키마) | ✅ |
| Phase 5 | GitHub Secrets 추가 (PROD/DEV 분리) | ✅ |
| Phase 6 | BACK-41 PR #53 develop 머지 → Server 2 CI/CD 배포 확인 | ✅ |
| Phase 7 | Server 2 추가 설정: DuckDNS cron, Swap 2GB 확인, certbot hook | ✅ |
| Phase 8 | PR #54 (release BACK-26~41) main 머지 → Server 1 prod-only nginx 적용 | ✅ |

### 변경된 코드

| 파일 | 변경 내용 |
|---|---|
| `nginx/conf.d/portfolio-prod.conf` | 신규 — Server 1 전용 (prod 도메인만) |
| `nginx/conf.d/portfolio-dev.conf` | 신규 — Server 2 전용 (dev 도메인만) |
| `.github/workflows/deploy.yml` | deploy-prod: `ORACLE_HOST_PROD`/`ORACLE_SSH_KEY_PROD` 사용 |
| `.github/workflows/deploy.yml` | deploy-dev: `ORACLE_HOST_DEV`/`ORACLE_SSH_KEY_DEV` 사용 |
