# 서버 인프라 전체 구조 가이드

> 이 문서는 포트폴리오 백엔드 프로젝트의 서버 인프라를 처음부터 끝까지 설명합니다.
> SSH 키, 네트워크 방화벽, Docker, Nginx, HTTPS까지 — 각 구성요소가 **왜 필요한지**,
> **어디서 어떻게 동작하는지**를 요청 흐름을 따라가며 정리합니다.

---

## 목차

1. [전체 구조 한눈에 보기](#1-전체-구조-한눈에-보기)
2. [네트워크 보안 3계층](#2-네트워크-보안-3계층)
3. [SSH 키 인증](#3-ssh-키-인증)
4. [도메인과 DNS (DuckDNS)](#4-도메인과-dns-duckdns)
5. [HTTPS와 SSL/TLS 인증서](#5-https와-ssltls-인증서)
6. [Nginx의 역할](#6-nginx의-역할)
7. [Docker와 컨테이너 네트워크](#7-docker와-컨테이너-네트워크)
8. [요청의 전체 흐름 (End-to-End)](#8-요청의-전체-흐름-end-to-end)
9. [2대 서버 분리 구조](#9-2대-서버-분리-구조)
10. [서버 이전 체크리스트](#10-서버-이전-체크리스트)

---

## 1. 전체 구조 한눈에 보기

```
[사용자 브라우저]
      │
      │ HTTPS (443포트)
      ▼
[DuckDNS DNS]  hsm9411.duckdns.org → 158.180.75.205 (IP 변환)
      │
      ▼
┌─────────────────────────────────────────────────────┐
│  OCI (Oracle Cloud Infrastructure)                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │  Security List (클라우드 방화벽)              │   │
│  │  허용: 22(SSH), 80(HTTP), 443(HTTPS)         │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                               │
│  ┌──────────────────▼───────────────────────────┐   │
│  │  VM (Ubuntu 24.04, 1vCPU / 1GB RAM)          │   │
│  │                                              │   │
│  │  ┌──────────────────────────────────────┐    │   │
│  │  │  UFW (OS 방화벽)                     │    │   │
│  │  │  허용: 22, 80, 443                   │    │   │
│  │  └──────────────────┬───────────────────┘    │   │
│  │                     │                        │   │
│  │  ┌──────────────────▼───────────────────┐    │   │
│  │  │  Docker                              │    │   │
│  │  │                                      │    │   │
│  │  │  [portfolio-nginx] ←── 80, 443       │    │   │
│  │  │       │                              │    │   │
│  │  │       ├──→ [portfolio-backend:3000]  │    │   │
│  │  │       └──→ [portfolio-backend-dev:3000]   │   │
│  │  │                │                    │    │   │
│  │  │         [portfolio-redis:6379]       │    │   │
│  │  └──────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

외부에서 들어온 요청은 **총 3개의 방화벽 계층**을 통과해야 NestJS 앱에 닿습니다.
각 계층의 역할과 존재 이유를 아래에서 하나씩 설명합니다.

---

## 2. 네트워크 보안 3계층

인터넷에 연결된 서버는 24시간 무작위 포트 스캔과 공격을 받습니다. 방어선이 하나뿐이라면 그것이 뚫리는 순간 모든 것이 노출됩니다. 계층을 나누는 이유는 **하나가 잘못 설정되어도 다른 계층이 막아주기 때문**입니다.

### 계층 1: OCI Security List (클라우드 방화벽)

```
인터넷 ──→ [OCI Security List] ──→ VM
              허용: 22, 80, 443
              나머지: 전부 차단
```

OCI는 VM에 물리적으로 도달하기 전에 클라우드 수준에서 트래픽을 필터링합니다. VM의 OS가 켜지기도 전에 차단되므로 가장 강력한 1차 방어선입니다.

- **22 (SSH)**: 서버 관리용 원격 접속
- **80 (HTTP)**: HTTPS 리다이렉트 수신 + Let's Encrypt 인증서 발급용
- **443 (HTTPS)**: 실제 서비스 트래픽
- **나머지 모두 차단**: 3000(NestJS), 6379(Redis), 9090(Prometheus) 등은 외부에서 직접 접근 불가

**설정 위치**: OCI 콘솔 → Networking → Virtual Cloud Networks → Security Lists

### 계층 2: UFW (OS 방화벽 / iptables 프론트엔드)

```
OCI Security List 통과
        │
        ▼
[UFW] ──→ 허용된 포트만 VM 내부로 통과
```

OCI Security List를 통과했더라도 VM 내부에서 OS 레벨 방화벽이 한 번 더 거릅니다.

**UFW가 별도로 존재하는 이유:**
- OCI Security List는 VCN 관리자가 실수로 규칙을 바꿀 수 있음
- VM을 다른 클라우드나 베어메탈로 이전해도 동일한 보안 규칙 유지
- 포트별 접근 허용을 두 곳에서 관리 → 하나가 잘못돼도 안전

**UFW 내부 동작**: UFW는 실제로 Linux 커널의 `netfilter`(=`iptables`/`nftables`)를 설정하는 편의 도구입니다. `sudo ufw status`로 현재 규칙 확인 가능.

```bash
# 현재 규칙 확인
sudo ufw status verbose

# 결과 예시
Status: active
To                         Action      From
--                         ------      ----
22/tcp                     ALLOW IN    Anywhere
80/tcp                     ALLOW IN    Anywhere
443/tcp                    ALLOW IN    Anywhere
```

### 계층 3: Docker 네트워크 격리

```
UFW 통과
   │
   ▼
Docker 네트워크 (컨테이너 간 격리)
   ├── global-portfolio-network: Nginx ↔ 백엔드 앱
   ├── portfolio-backend_internal: 앱 ↔ Redis (외부 노출 없음)
   └── portfolio-backend-dev_internal: dev앱 ↔ dev Redis
```

Docker 컨테이너는 기본적으로 서로 통신할 수 없습니다. 명시적으로 같은 네트워크에 연결해야만 통신이 가능합니다. Redis가 `internal` 네트워크에만 있으면 Nginx나 외부에서는 절대 Redis에 직접 접근할 수 없습니다.

```yaml
# docker-compose.yml 에서 네트워크 격리 예시
services:
  app:
    networks:
      - internal   # Redis와 통신
      - global     # Nginx와 통신

  redis:
    networks:
      - internal   # 앱하고만 통신, 외부 노출 없음
```

---

## 3. SSH 키 인증

### 왜 비밀번호 대신 키를 쓰는가

비밀번호 인증은 자동화 스크립트로 수백만 번 시도하는 무차별 공격(brute force)에 취약합니다. SSH 키는 2048~4096비트 수학적 문제로 보호되므로 현실적으로 뚫을 수 없습니다.

### 공개키/개인키 동작 원리

```
[로컬 PC]                         [서버]
개인키 (private key)  ←→  공개키 (public key)
  - 절대 외부 유출 금지           - ~/.ssh/authorized_keys 에 등록
  - 서명(Signature) 생성          - 서명 검증
```

1. 로컬에서 SSH 접속 시도
2. 서버가 난수(challenge)를 보냄
3. 로컬 PC가 **개인키**로 난수에 서명
4. 서버가 **공개키**로 서명을 검증 → 일치하면 접속 허용

**핵심**: 공개키는 서버에 올려도 되고 유출돼도 무방합니다. 개인키는 로컬 PC에서 절대 나가면 안 됩니다.

### 이 프로젝트의 키 구조

```
C:\Users\hasun\Desktop\oracle\
├── ssh-key-2026-02-07.key        ← 개인키 (Server 1용)
├── ssh-key-2026-02-07.key.pub    ← 공개키 (Server 1 등록됨)
├── [MSA서버 개인키]               ← 개인키 (Server 2용)
└── [MSA서버 공개키]               ← 공개키 (Server 2 등록됨)
```

### GitHub Actions에서 SSH를 쓰는 방식

CI/CD가 서버에 자동 배포하려면 GitHub Actions 러너(가상 머신)도 서버에 SSH 접속이 필요합니다. 개인키를 GitHub Secrets에 저장하면 Actions 실행 시 임시로 사용됩니다.

```
GitHub Actions 러너
      │
      │ 1. Secrets에서 개인키 꺼냄
      │ 2. ~/.ssh/id_rsa 로 저장
      │ 3. SSH 접속 시도
      ▼
서버 (authorized_keys에 공개키 있음)
      │
      │ 4. 서명 검증 성공
      ▼
배포 명령 실행
```

```yaml
# deploy.yml 내 SSH 설정 부분 해설
- name: Setup SSH
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.ORACLE_SSH_KEY }}" > ~/.ssh/id_rsa   # 개인키 임시 저장
    chmod 600 ~/.ssh/id_rsa                                  # 소유자만 읽기 (필수)
    # StrictHostKeyChecking no: 처음 접속 시 fingerprint 확인 생략
```

**2서버 분리 후 필요한 Secrets:**

| Secret 이름 | 내용 | 용도 |
|---|---|---|
| `ORACLE_SSH_KEY` → `ORACLE_SSH_KEY_PROD` | Server 1 개인키 | prod 배포 |
| `ORACLE_SSH_KEY_DEV` | Server 2 개인키 | dev 배포 |
| `ORACLE_HOST` → `ORACLE_HOST_PROD` | Server 1 IP | prod SSH 대상 |
| `ORACLE_HOST_DEV` | Server 2 IP | dev SSH 대상 |
| `ORACLE_USER` | `ubuntu` | SSH 사용자명 (공통) |

---

## 4. 도메인과 DNS (DuckDNS)

### DNS가 하는 일

사람은 `hsm9411.duckdns.org`를 기억하고, 컴퓨터는 `158.180.75.205` 같은 IP로 통신합니다. DNS는 도메인을 IP로 변환해주는 전화번호부 역할입니다.

```
브라우저: "hsm9411.duckdns.org 로 가고 싶어"
        │
        ▼
DNS 서버에 질의: "hsm9411.duckdns.org 의 IP가 뭐야?"
        │
        ▼
DNS 응답: "158.180.75.205 야"
        │
        ▼
브라우저: 158.180.75.205:443 으로 TCP 연결
```

### DuckDNS를 쓰는 이유

OCI Free Tier VM의 공인 IP는 고정이지만, 별도 도메인 구매 없이 무료로 `*.duckdns.org` 서브도메인을 사용할 수 있습니다. Let's Encrypt로 HTTPS 인증서도 발급 가능합니다.

```
hsm9411.duckdns.org     → 158.180.75.205  (Server 1, prod)
hsm9411-dev.duckdns.org → 158.180.75.205  (Server 1, 현재)
                        → [Server 2 IP]   (분리 후)
```

### 2서버 분리 시 DuckDNS 변경

```
[변경 전]
hsm9411-dev.duckdns.org → 158.180.75.205 (Server 1)

[변경 후]
hsm9411-dev.duckdns.org → [Server 2 IP]  (Server 2)
```

DuckDNS 대시보드에서 A레코드만 바꾸면 됩니다. DNS 전파는 보통 수 분 내에 완료됩니다.

---

## 5. HTTPS와 SSL/TLS 인증서

### 왜 HTTPS가 필요한가

HTTP는 평문 통신입니다. 중간 경로(ISP, 공용 Wi-Fi 등)에서 패킷을 캡처하면 내용을 볼 수 있습니다. HTTPS는 TLS(전 SSL)로 암호화하여 이를 방지합니다.

```
HTTP (위험):  브라우저 ──평문──→ 인터넷 ──평문──→ 서버
HTTPS (안전): 브라우저 ──암호문──→ 인터넷 ──암호문──→ 서버
                                     (중간에서 읽어도 해독 불가)
```

### 인증서가 하는 두 가지 역할

1. **암호화**: 통신 내용을 암호화하는 키 교환에 사용
2. **신원 확인**: "이 서버가 진짜 hsm9411.duckdns.org 맞아?" 를 공인 기관(CA)이 보증

### Let's Encrypt + certbot

Let's Encrypt는 무료 공인 인증기관(CA)입니다. certbot은 인증서를 자동으로 발급·갱신해주는 도구입니다.

**인증서 발급 과정 (HTTP-01 챌린지):**

```
certbot: "내가 hsm9411.duckdns.org 의 진짜 주인이야"
         │
         │ 1. 임시 파일을 서버에 생성
         ▼
Let's Encrypt: "http://hsm9411.duckdns.org/.well-known/acme-challenge/[토큰]
               에 접근해볼게"
         │
         │ 2. 도메인 → IP → 서버로 실제 HTTP 요청
         ▼
서버: 파일 응답 성공
         │
         │ 3. 도메인 소유 확인됨 → 인증서 발급
         ▼
certbot: fullchain.pem (인증서) + privkey.pem (개인키) 저장
```

**이 과정이 가능하려면:**
- DuckDNS가 해당 서버 IP를 가리키고 있어야 함
- 80번 포트가 열려 있어야 함 (HTTP 챌린지 수신)
- Nginx가 `/.well-known/acme-challenge/` 경로를 certbot이 만든 파일로 응답해야 함

### 인증서 파일 구조

```
/etc/nginx/ssl/
├── prod/
│   ├── fullchain.pem    ← 인증서 + 중간CA 인증서 체인 (Nginx에 제공)
│   └── privkey.pem      ← 인증서 개인키 (절대 유출 금지)
└── dev/
    ├── fullchain.pem
    └── privkey.pem
```

Docker에서는 이 경로를 볼륨으로 마운트합니다:

```yaml
# docker-compose.nginx.yml
nginx:
  volumes:
    - ./nginx/ssl:/etc/nginx/ssl   # 호스트 경로 → 컨테이너 내부 경로
```

### 2서버 분리 시 인증서

Server 2는 새 서버이므로 `hsm9411-dev.duckdns.org` 인증서를 새로 발급해야 합니다.

```
Server 2 설정 순서:
1. DuckDNS: hsm9411-dev.duckdns.org → Server 2 IP 변경
2. Server 2 UFW: 80, 443 열기
3. Server 2에서 certbot 실행 → 인증서 발급
4. Nginx 컨테이너 시작 (인증서 볼륨 마운트)
```

---

## 6. Nginx의 역할

NestJS 앱을 직접 443 포트에 띄우지 않고 Nginx를 앞에 두는 이유가 있습니다.

### Nginx가 하는 일 목록

```
[클라이언트]
     │ HTTPS 요청
     ▼
[Nginx]
  ① HTTP → HTTPS 리다이렉트 (80 → 443)
  ② SSL 종단 (TLS 복호화, 인증서 제공)
  ③ 보안 헤더 추가
  ④ 요청을 백엔드로 프록시
  ⑤ (미래) 경로별 라우팅, Rate Limit, Basic Auth 등
     │ HTTP (평문, 컨테이너 내부망)
     ▼
[NestJS 앱 :3000]
```

**① 80 → 443 리다이렉트**

```nginx
server {
    listen 80;
    server_name hsm9411.duckdns.org;
    return 301 https://$host$request_uri;  # 영구 리다이렉트
}
```

80포트로 들어오는 HTTP 요청을 모두 HTTPS로 보냅니다. 사용자가 `http://` 로 접속해도 자동으로 `https://` 로 전환됩니다.

**② SSL 종단 (TLS Termination)**

```nginx
server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/ssl/prod/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/prod/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
}
```

클라이언트와 Nginx 사이는 HTTPS (암호화), Nginx와 NestJS 사이는 HTTP (평문)입니다. NestJS가 TLS를 직접 처리할 필요가 없어집니다.

```
[브라우저] ─── HTTPS (암호화) ───→ [Nginx] ─── HTTP (평문, 내부망) ───→ [NestJS]
                                    ↑
                               여기서 복호화 (SSL Termination)
```

**③ 보안 헤더**

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
# → 브라우저에게 "앞으로 1년은 항상 HTTPS만 써" 라고 지시

add_header X-Frame-Options "SAMEORIGIN" always;
# → 이 페이지를 iframe으로 다른 사이트에 삽입하는 것 차단 (클릭재킹 방지)

add_header X-Content-Type-Options "nosniff" always;
# → 브라우저가 응답의 Content-Type을 임의로 바꾸는 것 방지
```

**④ 리버스 프록시**

```nginx
location / {
    proxy_pass http://portfolio-backend:3000;
    proxy_set_header X-Real-IP  $remote_addr;
    # → NestJS에 실제 클라이언트 IP 전달 (조회수 중복 체크에 사용)
}
```

Nginx는 `portfolio-backend`라는 컨테이너 이름으로 NestJS에 요청을 전달합니다. 이 이름 해석은 Docker 내부 DNS가 처리합니다.

### 현재 구조에서 prod/dev 분기

```nginx
# 하나의 Nginx가 두 도메인을 처리하는 방식 (Virtual Hosting)
server {
    server_name hsm9411.duckdns.org;       # Host 헤더가 이거면
    proxy_pass http://portfolio-backend:3000;  # prod로
}

server {
    server_name hsm9411-dev.duckdns.org;       # Host 헤더가 이거면
    proxy_pass http://portfolio-backend-dev:3000;  # dev로
}
```

클라이언트가 보내는 HTTP 요청에는 `Host: hsm9411.duckdns.org` 같은 헤더가 포함됩니다. Nginx는 이 헤더를 보고 어느 백엔드로 보낼지 결정합니다.

### 2서버 분리 후 각 Nginx

```
Server 1 Nginx (portfolio.conf)    Server 2 Nginx (portfolio-dev.conf)
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ 80 → 443 리다이렉트 (prod)   │   │ 80 → 443 리다이렉트 (dev)        │
│ ssl: prod 인증서             │   │ ssl: dev 인증서                   │
│ → portfolio-backend:3000     │   │ → portfolio-backend-dev:3000      │
└──────────────────────────────┘   │ (미래) → grafana:4000            │
                                   └──────────────────────────────────┘
```

---

## 7. Docker와 컨테이너 네트워크

### 왜 Docker를 쓰는가

직접 서버에 Node.js를 설치해서 실행할 수도 있습니다. 하지만:

| 문제 | Docker 해결 방식 |
|---|---|
| "내 PC에선 되는데 서버에선 안 돼" | 동일한 환경(이미지)을 어디서든 실행 |
| 여러 서비스가 같은 OS에서 충돌 | 각 컨테이너가 독립된 환경 |
| 배포 시 서비스 중단 | 새 컨테이너를 먼저 띄우고 교체 |
| 롤백 | 이전 이미지로 즉시 복구 |

### 이 프로젝트의 컨테이너 구성

```
[Server 1 현재]

Docker
├── portfolio-nginx          (이미지: nginx:1.25-alpine)
│   포트: 80:80, 443:443     ← 외부 포트 노출
│   네트워크: global
│
├── portfolio-backend        (이미지: ghcr.io/hsm9411/portfolio-backend:latest)
│   expose: 3000             ← 외부 노출 없음, Docker 내부만
│   네트워크: internal, global
│
├── portfolio-redis          (이미지: redis:7-alpine)
│   expose: 6379             ← 외부 노출 없음
│   네트워크: internal        ← app과만 통신
│
├── portfolio-backend-dev    (이미지: ghcr.io/...portfolio-backend:develop)
│   expose: 3000
│   네트워크: internal-dev, global
│
└── portfolio-redis-dev      (이미지: redis:7-alpine)
    expose: 6379
    네트워크: internal-dev    ← dev app과만 통신
```

### Docker 네트워크 격리 상세

```
[외부 인터넷]
      │
      │ 80, 443 만 통과 (UFW 허용)
      ▼
portfolio-nginx
      │ global-portfolio-network
      ├──────────────────────────────────┐
      │                                  │
      ▼                                  ▼
portfolio-backend              portfolio-backend-dev
      │                                  │
      │ internal (bridge)     internal-dev (bridge)
      ▼                                  ▼
portfolio-redis             portfolio-redis-dev
(외부 접근 불가)              (외부 접근 불가)
```

`portfolio-redis`는 `internal` 네트워크에만 존재합니다. Nginx도, 외부 인터넷도 Redis에 직접 접근할 방법이 없습니다.

### Docker 이미지 배포 흐름 (CI/CD)

```
[개발자 PC]
  코드 작성 → git push → GitHub
                              │
                    GitHub Actions 실행
                              │
              ┌───────────────┼───────────────┐
              │               │               │
           lint           docker build    docker push
                         (Dockerfile)    → GHCR (Registry)
                                              │
                                 SSH로 서버 접속
                                              │
                               docker pull (새 이미지 받기)
                                              │
                               docker compose up -d (재시작)
```

**GHCR (GitHub Container Registry)**: GitHub에서 제공하는 Docker 이미지 저장소입니다. 이미지를 여기 저장해두면 서버가 어디에 있어도 동일한 이미지를 가져올 수 있습니다.

---

## 8. 요청의 전체 흐름 (End-to-End)

`https://hsm9411.duckdns.org/posts` 로 GET 요청이 들어올 때 실제로 어떤 일이 일어나는지 순서대로 따라갑니다.

```
1. 브라우저: "hsm9411.duckdns.org 의 IP 알려줘"
                │
                ▼
2. DNS 질의: DuckDNS → 158.180.75.205 응답

3. 브라우저: 158.180.75.205:443 으로 TCP 연결 시도
                │
                ▼
4. OCI Security List: 443 허용 → 통과
                │
                ▼
5. UFW: 443 허용 → 통과
                │
                ▼
6. Docker: 443 포트 → portfolio-nginx 컨테이너로 전달
                │
                ▼
7. Nginx TLS Handshake:
   - 서버가 fullchain.pem (인증서) 제시
   - 브라우저가 Let's Encrypt 서명 확인 → 신뢰
   - 대칭키 교환 → 이후 통신 암호화
                │
                ▼
8. Nginx 요청 처리:
   - Host 헤더 확인: "hsm9411.duckdns.org"
   - → portfolio-backend:3000 으로 프록시
   - X-Real-IP, X-Forwarded-For 헤더 추가
                │
                ▼ (HTTP 평문, Docker 내부망)
9. NestJS (portfolio-backend:3000):
   - JWT 검증, 비즈니스 로직 처리
   - Redis 조회 (portfolio-redis:6379)
   - Supabase DB 조회 (외부 연결)
                │
                ▼
10. 응답이 역순으로 브라우저까지 전달
    NestJS → Nginx (암호화) → 브라우저
```

---

## 9. 2대 서버 분리 구조

### 목표 아키텍처

```
[인터넷]
    │
    ├── hsm9411.duckdns.org ──→ Server 1 IP
    │
    └── hsm9411-dev.duckdns.org ──→ Server 2 IP

┌────────────────────────────┐    ┌──────────────────────────────────┐
│  Server 1 (Prod 전용)       │    │  Server 2 (Dev + 모니터링)        │
│  158.180.75.205             │    │  [새 IP]                          │
│                            │    │                                  │
│  UFW: 22, 80, 443           │    │  UFW: 22, 80, 443                │
│                            │    │  (미래: VCN 내부 3000 허용)        │
│  [portfolio-nginx]         │    │  [portfolio-nginx-dev]            │
│    → portfolio-backend      │    │    → portfolio-backend-dev        │
│                            │    │    → (미래) grafana:4000           │
│  [portfolio-backend]        │    │  [portfolio-backend-dev]          │
│  [portfolio-redis]          │    │  [portfolio-redis-dev]            │
│                            │    │  (미래) [prometheus]              │
│                            │    │  (미래) [grafana]                 │
└────────────────────────────┘    └──────────────────────────────────┘
         │  VCN 내부 사설망 (미래)          │
         └──────────── 프라이빗 IP ─────────┘
           (Prometheus → prod /metrics scrape 시 사용)
```

### 모니터링 연동 (미래: BACK-31)

Prometheus가 prod 메트릭을 수집하려면 Server 1의 NestJS `/metrics` 엔드포인트에 접근해야 합니다. 두 서버가 같은 OCI VCN 안에 있으므로 사설 IP로 직접 통신이 가능합니다.

```
Server 2 Prometheus ──→ Server 1 사설IP:3000/metrics
                         (VCN 내부망, 공인 IP/UFW 거치지 않음)
```

이를 위해 Server 1 UFW에 Server 2 사설 IP에서 오는 3000 포트를 허용하는 규칙을 추가합니다:

```bash
# Server 1에서 실행 (Server 2 사설 IP가 10.0.0.x 일 경우 예시)
sudo ufw allow from 10.0.0.[Server2_IP] to any port 3000
```

공인 인터넷을 거치지 않으므로 보안상 안전하고, `/metrics` 엔드포인트를 외부에 노출할 필요가 없습니다.

### CI/CD 변경 내용

```yaml
# 변경 전: 모두 같은 서버
deploy-prod: HOST = ORACLE_HOST        # Server 1
deploy-dev:  HOST = ORACLE_HOST        # Server 1 (동일)

# 변경 후: 서버 분리
deploy-prod: HOST = ORACLE_HOST_PROD   # Server 1
deploy-dev:  HOST = ORACLE_HOST_DEV    # Server 2
```

### Nginx 설정 파일 분리

```
nginx/conf.d/
├── portfolio-prod.conf   ← Server 1 배포 시 사용
│   (prod 도메인 블록만 포함)
└── portfolio-dev.conf    ← Server 2 배포 시 사용
    (dev 도메인 블록만 포함)
```

---

## 10. 서버 이전 체크리스트

### Phase 1 — Server 2 기반 준비

- [ ] OCI 콘솔에서 Server 2 공인 IP 확인
- [ ] Server 2 SSH 접속 확인 (`ssh -i [키파일] ubuntu@[Server2 IP]`)
- [ ] MSA 컨테이너 전체 정지 및 삭제 (`docker compose down -v`)
- [ ] Docker 버전 확인 (`docker --version`)
- [ ] UFW 상태 확인 및 22, 80, 443 허용 (`sudo ufw status`)
- [ ] OCI Security List에서 80, 443 허용 확인

### Phase 2 — dev 도메인 이전

- [ ] DuckDNS: `hsm9411-dev.duckdns.org` A레코드 → Server 2 IP로 변경
- [ ] DNS 전파 확인 (`nslookup hsm9411-dev.duckdns.org`)
- [ ] Server 2에서 certbot으로 dev SSL 인증서 발급
- [ ] 인증서 파일 위치 확인 (`~/portfolio-backend/nginx/ssl/dev/`)

### Phase 3 — 코드 및 CI/CD 변경

- [ ] `nginx/conf.d/portfolio.conf` → `portfolio-prod.conf`, `portfolio-dev.conf` 분리
- [ ] `deploy.yml` → `ORACLE_HOST_PROD`, `ORACLE_HOST_DEV`로 분리
- [ ] GitHub Secrets 추가: `ORACLE_HOST_PROD`, `ORACLE_HOST_DEV`, `ORACLE_SSH_KEY_DEV`
- [ ] develop 브랜치 push → Server 2 배포 확인
- [ ] `https://hsm9411-dev.duckdns.org/health` 응답 확인

### Phase 4 — Server 1 정리

- [ ] dev 컨테이너 삭제 (`docker rm -f portfolio-backend-dev portfolio-redis-dev`)
- [ ] Server 1 Nginx conf에서 dev 서버 블록 제거 (→ `portfolio-prod.conf` 만 사용)
- [ ] Nginx reload (`docker exec portfolio-nginx nginx -s reload`)
- [ ] `https://hsm9411.duckdns.org/health` 정상 동작 최종 확인

### Phase 5 — 모니터링 (별도 이슈: BACK-31)

- [ ] Server 2에 Prometheus + Grafana 추가
- [ ] Server 1 UFW: Server 2 사설 IP → 3000 포트 허용
- [ ] Prometheus 설정: Server 1 사설IP:3000/metrics scrape 추가
- [ ] Grafana 대시보드 구성

---

## 참고: 자주 쓰는 명령어

```bash
# 컨테이너 상태 확인
docker ps

# 컨테이너 로그 확인
docker logs portfolio-backend --tail=50

# Nginx 설정 문법 검사
docker exec portfolio-nginx nginx -t

# Nginx 무중단 재시작
docker exec portfolio-nginx nginx -s reload

# UFW 상태 확인
sudo ufw status verbose

# DNS 확인
nslookup hsm9411.duckdns.org
nslookup hsm9411-dev.duckdns.org

# 포트 개방 확인
curl -I https://hsm9411.duckdns.org/health
```
