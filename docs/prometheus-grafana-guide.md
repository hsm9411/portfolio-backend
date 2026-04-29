# Prometheus + Grafana 모니터링 가이드

> 이 프로젝트(portfolio-backend)의 실제 구성을 기반으로 정리한 학습 문서.  
> BACK-31 / BACK-43 / BACK-45 작업을 통해 구축·수정한 내용을 담음.

---

## 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [Prometheus 핵심 개념](#2-prometheus-핵심-개념)
3. [Exporter 종류와 역할](#3-exporter-종류와-역할)
4. [PromQL 기초](#4-promql-기초)
5. [Grafana 핵심 개념](#5-grafana-핵심-개념)
6. [Grafana Provisioning](#6-grafana-provisioning)
7. [이 프로젝트의 실제 구성](#7-이-프로젝트의-실제-구성)
8. [대시보드별 주요 메트릭](#8-대시보드별-주요-메트릭)
9. [트러블슈팅 실록](#9-트러블슈팅-실록)
10. [대시보드 JSON 갱신 방법](#10-대시보드-json-갱신-방법)

---

## 1. 전체 아키텍처 개요

### Pull 방식 vs Push 방식

```
Push 방식 (e.g. Datadog 등)         Pull 방식 (Prometheus)
─────────────────────────          ──────────────────────────
앱 → [Agent] → 모니터링 서버         모니터링 서버 → [HTTP GET] → 앱 /metrics
  능동적으로 전송                       Prometheus가 주기적으로 긁어감 (Scrape)
```

Prometheus는 **Pull 방식**. 각 대상(target)이 `/metrics` HTTP 엔드포인트를 노출하면
Prometheus가 일정 주기(기본 15s)로 수집해 간다.

---

### 이 프로젝트 전체 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│  Server 1 (Prod, 158.180.75.205)                                │
│                                                                 │
│  ┌──────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐  │
│  │  nginx   │  │  backend   │  │node-exporter│  │ cAdvisor  │  │
│  │ :80/:443 │  │  :3000     │  │ :9100(host) │  │  :8080    │  │
│  └──────────┘  └────────────┘  └────────────┘  └───────────┘  │
│                  /metrics ↑              ↑              ↑       │
└──────────────────────────|──────────────|──────────────|────────┘
                           |   OCI VCN 내부망 (10.0.0.0/24)
                           |              |              |
┌──────────────────────────|──────────────|──────────────|────────┐
│  Server 2 (Dev+Monitor, 152.67.216.145) |              |        │
│                          ↓              ↓              ↓        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Prometheus (:9090, 내부전용)                 │   │
│  │  scrape_interval: 15s                                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │backend-  │ │node_     │ │cadvisor  │ │nginx /   │   │   │
│  │  │dev/prod  │ │exporter  │ │dev/prod  │ │redis_exp │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         │ PromQL 쿼리                            │
│                         ↓                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Grafana (:3000 → nginx /grafana 서브경로)                │   │
│  │  - Datasource: Prometheus (자동 설정, provisioning)       │   │
│  │  - 대시보드: 4개 자동 로드 (JSON provisioning)            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Dev 앱 스택]                   [Exporter 스택]               │
│  backend-dev:3000  redis-dev     nginx-exporter  redis-exporter │
│  node-exporter(host) cAdvisor-dev                               │
└─────────────────────────────────────────────────────────────────┘
                         ↓ HTTPS
              https://hsm9411-dev.duckdns.org/grafana
```

---

## 2. Prometheus 핵심 개념

### 2-1. Metrics 4가지 타입

| 타입 | 설명 | 예시 |
|------|------|------|
| **Counter** | 단조 증가. 절대 줄지 않음 | `http_requests_total`, `node_network_receive_bytes_total` |
| **Gauge** | 증감 가능한 현재값 | `node_memory_MemAvailable_bytes`, `redis_connected_clients` |
| **Histogram** | 버킷별 분포 + sum + count | `http_request_duration_seconds` |
| **Summary** | 분위수(p50/p95/p99) | 요청 지연시간 분포 |

```
# Counter 예시 (node-exporter)
node_network_receive_bytes_total{device="eth0"} 1234567890

# Gauge 예시
node_memory_MemAvailable_bytes 2147483648

# Histogram 예시 (버킷이 함께 노출됨)
http_request_duration_seconds_bucket{le="0.1"} 234
http_request_duration_seconds_bucket{le="0.5"} 890
http_request_duration_seconds_bucket{le="+Inf"} 1000
http_request_duration_seconds_sum 123.4
http_request_duration_seconds_count 1000
```

### 2-2. Labels (레이블)

메트릭에 붙는 **키=값** 쌍. 같은 메트릭을 여러 차원으로 구분한다.

```
node_cpu_seconds_total{cpu="0", mode="idle"}   → CPU 0번, idle 상태
node_cpu_seconds_total{cpu="0", mode="system"} → CPU 0번, system 상태
node_cpu_seconds_total{cpu="1", mode="idle"}   → CPU 1번, idle 상태
```

이 프로젝트에서 `server` 라벨로 dev/prod를 구분:
```yaml
# prometheus.yml
- job_name: node_exporter
  static_configs:
    - targets: ['10.0.0.196:9100']
      labels:
        server: dev    # ← 이게 모든 메트릭에 붙음
    - targets: ['10.0.0.34:9100']
      labels:
        server: prod
```

→ Grafana에서 `{server="dev"}` 필터로 Dev 서버만 볼 수 있음.

### 2-3. prometheus.yml 구조

```yaml
global:
  scrape_interval: 15s      # 기본 수집 주기
  evaluation_interval: 15s  # alerting rule 평가 주기

scrape_configs:
  - job_name: my-app        # job 이름 (메트릭의 job 라벨값)
    scrape_interval: 30s    # 이 job만 개별 설정 가능
    metrics_path: /metrics  # 기본값. 변경 가능
    scheme: http            # http / https
    static_configs:
      - targets: ['host:port']
        labels:
          key: value        # 추가 라벨
```

### 2-4. Scrape 주기와 데이터 보존

```
scrape_interval: 15s
→ 15초마다 /metrics를 GET
→ Prometheus 내부 TSDB(시계열 DB)에 저장
→ retention: 30d (이 프로젝트 설정)
→ 30일 지난 데이터는 자동 삭제
```

---

## 3. Exporter 종류와 역할

Exporter = **메트릭을 /metrics 형식으로 변환해주는 브릿지**.
직접 수정 불가능한 소프트웨어(nginx, redis 등)의 통계를 Prometheus가 읽을 수 있게 해준다.

```
┌────────────────────────────────────────────────────────────────┐
│                    이 프로젝트 Exporter 구성                     │
│                                                                │
│  node-exporter                                                 │
│  └─ 역할: 서버 OS 메트릭 (CPU/메모리/디스크/네트워크)           │
│  └─ 방식: network_mode: host (서버 직접 접근)                  │
│  └─ 포트: 9100                                                 │
│  └─ 주요 메트릭: node_cpu_seconds_total, node_memory_*        │
│                                                                │
│  cAdvisor (Container Advisor)                                  │
│  └─ 역할: Docker 컨테이너별 메트릭 (CPU/메모리/네트워크)        │
│  └─ 방식: /var/run/docker.sock 마운트                          │
│  └─ 포트: 8080 (내부 expose)                                   │
│  └─ 주요 메트릭: container_cpu_usage_seconds_total             │
│                  container_memory_usage_bytes                  │
│                  container_label_com_docker_compose_service    │
│                                                                │
│  nginx-prometheus-exporter                                     │
│  └─ 역할: nginx stub_status 파싱 → Prometheus 형식 변환        │
│  └─ 방식: nginx의 /stub_status 엔드포인트 polling              │
│  └─ 포트: 9113                                                 │
│  └─ 주요 메트릭: nginx_connections_active, nginx_requests_total│
│                                                                │
│  redis-exporter (oliver006/redis_exporter)                     │
│  └─ 역할: Redis INFO 명령 결과 → Prometheus 형식 변환          │
│  └─ 방식: Redis에 INFO 명령 주기적 실행                        │
│  └─ 포트: 9121                                                 │
│  └─ 주요 메트릭: redis_up, redis_connected_clients             │
│                  redis_memory_used_bytes, redis_commands_total │
└────────────────────────────────────────────────────────────────┘
```

### nginx stub_status 설정 (이 프로젝트)

nginx가 상태를 노출하려면 nginx.conf에 별도 블록 필요:

```nginx
server {
    listen 8080;   # 내부 전용 포트
    allow 172.0.0.0/8;  # Docker bridge 대역만 허용
    deny all;

    location /stub_status {
        stub_status;
    }
}
```

nginx-exporter가 이 URL을 polling → `/metrics`로 변환 → Prometheus가 scrape.

---

## 4. PromQL 기초

Prometheus Query Language. Grafana 패널에서 사용하는 쿼리 언어.

### 4-1. 기본 선택

```promql
# 메트릭 이름만 (전체)
node_memory_MemAvailable_bytes

# 라벨 필터
node_memory_MemAvailable_bytes{server="dev"}
node_memory_MemAvailable_bytes{server=~"dev|prod"}   # 정규식
node_memory_MemAvailable_bytes{server!="prod"}        # 제외
```

### 4-2. Counter → rate 변환

Counter는 계속 증가하므로 **변화량(초당 증가율)**으로 변환해야 의미있음:

```promql
# 최근 5분간 CPU 사용률 (mode != idle인 것만 합산)
rate(node_cpu_seconds_total{mode!="idle"}[5m])

# 초당 HTTP 요청 수
rate(http_requests_total[1m])
```

### 4-3. 집계 함수

```promql
# 서버별 메모리 평균
avg by (server) (node_memory_MemAvailable_bytes)

# 전체 CPU 사용률 (코어 합산)
sum(rate(node_cpu_seconds_total{mode!="idle"}[5m])) by (instance)

# 메모리 사용률 % 계산
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

### 4-4. 자주 쓰는 Node Exporter 쿼리

```promql
# CPU 사용률 %
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# 메모리 사용률 %
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# 디스크 사용률 %
100 - ((node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100)

# 네트워크 수신 속도 (Bytes/s)
rate(node_network_receive_bytes_total{device="eth0"}[5m])
```

---

## 5. Grafana 핵심 개념

### 5-1. 구성 요소 계층

```
Grafana
├── Organization (조직)
│   ├── Data Source (데이터 소스)
│   │   └── Prometheus (이 프로젝트 — uid: "prometheus")
│   ├── Folder (폴더)
│   │   └── Portfolio (이 프로젝트)
│   │       ├── Dashboard: Node Exporter Full
│   │       ├── Dashboard: cAdvisor
│   │       ├── Dashboard: Nginx Exporter
│   │       └── Dashboard: Redis Dashboard
│   └── User / Team
```

### 5-2. Dashboard 구성 요소

```
Dashboard
├── Variables (템플릿 변수) ← 드롭다운 필터
│   ├── $job       (Prometheus job 선택)
│   ├── $instance  (서버 인스턴스 선택)
│   └── $server    (dev / prod 선택)
└── Rows
    └── Panel (패널)
        ├── 데이터: PromQL 쿼리
        ├── 시각화: Time series / Gauge / Stat / Table 등
        └── 임계값: 색상으로 경고 표시
```

### 5-3. Variables (템플릿 변수)

대시보드 상단 드롭다운의 정체. PromQL로 후보값을 동적 조회한다.

```
예시: Node Exporter Full의 instance 변수
─────────────────────────────────────────
쿼리: label_values(node_uname_info{job="node_exporter"}, instance)
→ Prometheus에서 node_uname_info 메트릭의 instance 라벨 목록을 가져옴
→ 드롭다운에 10.0.0.196:9100 / 10.0.0.34:9100 표시
```

**대시보드 패널이 "No data"이면 대부분 이 변수의 job 필터가 실제 job_name과 다른 것.**

이 프로젝트에서 해결 방법:
- Prometheus job 이름을 커뮤니티 대시보드 기본값에 맞춤 (BACK-45)
  - `node-dev` → `node_exporter` (Node Exporter Full 기본 필터)
  - `cadvisor-dev` → `cadvisor`
  - `redis-dev` → `redis_exporter`

### 5-4. 패널 시각화 타입

| 타입 | 용도 |
|------|------|
| Time series | 시간에 따른 변화 그래프 (가장 일반적) |
| Stat | 단일 숫자 값 (현재 CPU 사용률 등) |
| Gauge | 게이지 차트 (0~100% 범위) |
| Bar chart | 카테고리별 비교 |
| Table | 메트릭 목록 표시 |
| Heatmap | 분포 히트맵 (Histogram에 적합) |

---

## 6. Grafana Provisioning

### 왜 필요한가?

```
Provisioning 없는 경우:
  Grafana 컨테이너 재시작
  → grafana-data 볼륨이 살아있으면 OK
  → 볼륨 삭제 or 신규 서버 셋업
  → Datasource 수동 추가 + 대시보드 수동 Import 필요 (매번)

Provisioning 있는 경우:
  Grafana 컨테이너 재시작
  → /etc/grafana/provisioning/ 안의 파일을 읽어 자동 적용
  → Datasource 자동 구성 + 대시보드 자동 로드 (코드로 관리)
```

### 6-1. Datasource Provisioning

`/etc/grafana/provisioning/datasources/*.yml`

```yaml
# 이 프로젝트: monitoring/grafana/provisioning/datasources/prometheus.yml
apiVersion: 1

datasources:
  - name: Prometheus
    uid: prometheus        # ← 대시보드 JSON에서 참조하는 고정 UID
    type: prometheus
    access: proxy          # Grafana 서버가 Prometheus에 접근 (브라우저 X)
    url: http://prometheus:9090   # Docker 내부 네트워크 hostname
    isDefault: true
    editable: false        # UI에서 수정 불가 (코드가 진실)
    jsonData:
      timeInterval: 15s   # Prometheus scrape 주기와 맞춤
      httpMethod: POST
```

### 6-2. Dashboard Provisioning

**Step 1**: Provider 설정 (`/etc/grafana/provisioning/dashboards/*.yml`)

```yaml
# 이 프로젝트: monitoring/grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: portfolio
    folder: Portfolio       # Grafana UI에서 보이는 폴더명
    type: file
    editable: true          # UI에서 수정은 가능 (저장은 파일에 반영 안 됨)
    updateIntervalSeconds: 30
    options:
      path: /etc/grafana/provisioning/dashboards/json  # JSON 파일 위치
```

**Step 2**: 대시보드 JSON 파일을 해당 경로에 배치

JSON 파일의 datasource UID가 provisioned datasource와 일치해야 함:
```json
// 패치 전 (grafana.com 원본)
"datasource": { "type": "prometheus", "uid": "${DS_PROMETHEUS}" }

// 패치 후 (이 프로젝트)
"datasource": { "type": "prometheus", "uid": "prometheus" }
```

### 6-3. Docker Compose 마운트

```yaml
grafana:
  image: grafana/grafana:11.3.0
  volumes:
    - grafana-data:/var/lib/grafana           # 사용자 데이터 (영속)
    - ./grafana/provisioning:/etc/grafana/provisioning:ro  # 코드 (읽기전용)
```

### 6-4. 전체 흐름

```
[git push develop]
      │
      ↓ CI/CD (deploy.yml)
[scp] monitoring/grafana/provisioning/ → ~/monitoring/grafana/provisioning/
[scp] monitoring/prometheus/prometheus.yml → ~/monitoring/prometheus/prometheus.yml
      │
      ↓ docker compose up -d
Grafana 컨테이너 시작
      │
      ├─ /etc/grafana/provisioning/datasources/ 읽기
      │  → "Prometheus" datasource (uid: prometheus) 자동 생성
      │
      └─ /etc/grafana/provisioning/dashboards/ 읽기
         → json/ 폴더의 *.json 파일 자동 로드
         → "Portfolio" 폴더에 4개 대시보드 표시
```

---

## 7. 이 프로젝트의 실제 구성

### 7-1. Docker Compose 네트워크 맵

```
┌──────────────────────────────────────────────────────────────┐
│  monitoring-network (portfolio-monitoring-network)           │
│                                                              │
│  prometheus ────┬──── cadvisor (8080)                       │
│                 ├──── nginx-exporter (9113)                  │
│                 └──── grafana                                │
│                                                              │
│  (cadvisor는 이 네트워크만. nginx-exporter는 아래도 참여)    │
└──────────────────┬───────────────────────┬───────────────────┘
                   │                       │
┌──────────────────┴──────┐  ┌────────────┴───────────────────┐
│  global-portfolio-network│  │  portfolio-dev-internal        │
│  (app)                   │  │  (internal)                    │
│                          │  │                                │
│  nginx ←→ backend-dev    │  │  backend-dev ←→ redis-dev     │
│  nginx ←→ grafana        │  │  redis-exporter ←→ redis-dev  │
│  nginx ←→ nginx-exporter │  │                                │
│  prometheus ←→ backend-dev│ └────────────────────────────────┘
└──────────────────────────┘

node-exporter: network_mode=host (OS 직접 접근, 네트워크 격리 없음)
```

### 7-2. Prometheus → Exporter 통신 경로

| Job | Prometheus 접근 방법 | 이유 |
|-----|---------------------|------|
| backend-dev | Docker 내부 hostname `portfolio-backend-dev:3000` | 같은 global 네트워크 |
| backend-prod | 공인 도메인 HTTPS `hsm9411.duckdns.org` | 다른 서버 → 공인망 경유 |
| node_exporter (dev) | Host IP `10.0.0.196:9100` | host mode → VCN 내부망 |
| node_exporter (prod) | Private IP `10.0.0.34:9100` | OCI VCN 내부망 |
| cadvisor (dev) | Docker hostname `cadvisor:8080` | monitoring 네트워크 |
| cadvisor (prod) | Private IP `10.0.0.34:8080` | OCI VCN 내부망 |
| nginx | Docker hostname `portfolio-nginx-exporter-dev:9113` | monitoring+app 네트워크 |
| redis_exporter | Docker hostname `portfolio-redis-exporter-dev:9121` | monitoring+dev-internal 네트워크 |

### 7-3. cAdvisor 특이사항 (cgroupv2 이슈)

Ubuntu 22.04 + systemd 환경에서 cAdvisor가 컨테이너 이름을 `name` 라벨로 노출하지 못하는 문제:

```
일반적인 기대:
  container_cpu_usage_seconds_total{name="portfolio-backend-dev"} ...

실제 (cgroupv2+systemd):
  container_cpu_usage_seconds_total{name=""} ...  ← 비어있음
```

**BACK-45 적용 해결책**:
1. `--docker=unix:///var/run/docker.sock` 플래그 명시
2. `--store_container_labels=false` + `--whitelisted_container_labels=com.docker.compose.service`
   → `container_label_com_docker_compose_service` 라벨로 서비스명 노출

```yaml
# docker-compose.monitoring.yml (BACK-45 이후)
cadvisor:
  command:
    - --docker=unix:///var/run/docker.sock
    - --store_container_labels=false
    - --whitelisted_container_labels=com.docker.compose.service
```

Grafana 대시보드에서 쿼리 시:
```promql
# name 라벨 대신 이것 사용
container_cpu_usage_seconds_total{container_label_com_docker_compose_service!=""}
```

---

## 8. 대시보드별 주요 메트릭

### Node Exporter Full (#1860)

| 패널 | PromQL 예시 |
|------|------------|
| CPU 사용률 | `100 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100` |
| 메모리 사용 | `node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes` |
| 디스크 사용률 | `1 - node_filesystem_avail_bytes / node_filesystem_size_bytes` |
| 네트워크 수신 | `rate(node_network_receive_bytes_total[5m])` |
| Load Average | `node_load1`, `node_load5`, `node_load15` |

### cAdvisor (#14282)

| 패널 | PromQL 예시 |
|------|------------|
| 컨테이너 CPU | `rate(container_cpu_usage_seconds_total[5m])` |
| 컨테이너 메모리 | `container_memory_usage_bytes` |
| 컨테이너 네트워크 | `rate(container_network_receive_bytes_total[5m])` |

### Redis Dashboard (#11835)

| 패널 | PromQL 예시 |
|------|------------|
| Redis 상태 | `redis_up` (1=정상, 0=다운) |
| 연결 클라이언트 수 | `redis_connected_clients` |
| 메모리 사용 | `redis_memory_used_bytes` |
| 명령 처리 속도 | `rate(redis_commands_total[1m])` |
| 키 수 | `redis_db_keys` |

### Nginx Prometheus Exporter (#12708)

| 패널 | PromQL 예시 |
|------|------------|
| 활성 연결 | `nginx_connections_active` |
| 초당 요청 | `rate(nginx_http_requests_total[1m])` |
| 연결 상태별 | `nginx_connections_reading/writing/waiting` |

---

## 9. 트러블슈팅 실록

### 문제 1: 대시보드 패널 "No data" (BACK-45 이전)

**원인**: Prometheus job 이름이 커뮤니티 대시보드 변수 기본값과 불일치.

```
대시보드 Variable 쿼리:
  label_values(node_uname_info{job=~"node_exporter|node|integrations/node_exporter"}, instance)

실제 job 이름: node-dev, node-prod  ← regex에 안 걸림 → 드롭다운 비어있음 → No data
```

**해결**: job_name을 `node_exporter`로 통일 (BACK-45, PR #64).

---

### 문제 2: Prometheus 새 job 추가해도 반영 안 됨 (BACK-43)

**원인**: `prometheus.yml` 파일만 변경하면 컨테이너가 재시작되지 않아 설정 미반영.

```yaml
# docker compose up -d 는 docker-compose.yml 변경 시에만 재시작
# prometheus.yml (볼륨 마운트 파일)이 바뀌어도 컨테이너는 유지됨
```

**해결**: `--web.enable-lifecycle` 플래그 + `/-/reload` API 호출 (BACK-43, PR #61).

```bash
docker exec portfolio-prometheus wget -qO- --post-data='' http://localhost:9090/-/reload
```

---

### 문제 3: redis-exporter가 Redis에 접근 못 함 (BACK-43)

**원인**: `portfolio-redis-dev`가 `portfolio-dev-internal` 전용 네트워크에 있는데,
redis-exporter를 `global-portfolio-network`에만 연결함.

```
redis-exporter → (global 네트워크) → portfolio-redis-dev (dev-internal 전용) ← 불가
```

**해결**: redis-exporter를 `dev-internal` 네트워크에도 추가 (PR #62).

---

### 문제 4: OCI Server 1 node-exporter 포트 막힘 (BACK-43)

**원인**: OCI 인스턴스에 기본 iptables REJECT 규칙이 UFW 규칙보다 먼저 위치.
UFW allow만 해서는 안 됨.

**해결**:
```bash
sudo iptables -I INPUT -s 10.0.0.196 -p tcp --dport 9100 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

---

### 문제 5: Grafana datasource 없으면 대시보드 import 실패

커뮤니티 대시보드 JSON에 `${DS_PROMETHEUS}` 같은 datasource 변수 참조가 있음.
Provisioning 없이 import 시 datasource를 수동으로 매핑해야 함.

**해결**: datasource provisioning으로 고정 UID `prometheus` 설정 (BACK-45).
`download-dashboards.py`가 JSON 패치 시 `${DS_PROMETHEUS}` → `prometheus`로 교체.

---

## 10. 대시보드 JSON 갱신 방법

grafana.com의 커뮤니티 대시보드를 새 버전으로 업데이트하거나 추가할 때:

```bash
# 1. 스크립트 실행 (Windows: python, Linux: python3)
cd monitoring/grafana/provisioning/dashboards
python download-dashboards.py

# 2. json/ 폴더 확인
ls json/

# 3. git commit
git add json/
git commit -m "chore: update Grafana dashboard JSONs"

# 4. PR → develop merge → CI/CD가 서버에 자동 배포
```

새 대시보드 추가 시 `download-dashboards.py`의 `DASHBOARDS` 리스트에 항목 추가:

```python
DASHBOARDS = [
    (1860,  "node-exporter-full"),
    (12708, "nginx-prometheus-exporter"),
    (11835, "redis-dashboard"),
    (14282, "cadvisor"),
    (XXXXX, "new-dashboard"),   # ← 추가
]
```

---

## 현재 진행 상태 (2026-04-29)

| 항목 | 상태 |
|------|------|
| Prometheus 8개 target | ✅ all UP |
| Grafana provisioning | ✅ BACK-45 구현 완료 (PR #64 merge 대기) |
| Datasource 자동 구성 | ✅ provisioning으로 자동화 |
| 대시보드 4개 자동 로드 | ✅ JSON 파일 repo 포함, deploy 시 서버 복사 |
| cAdvisor name 라벨 | ⏳ PR #64 배포 후 확인 필요 |
| Node Exporter Full | ⏳ job=node_exporter 표준화로 No data 해결 예정 |

**다음 세션에서 확인할 것**:
1. PR #63 / PR #64 merge → CI/CD 배포 완료 확인
2. Grafana `https://hsm9411-dev.duckdns.org/grafana` → Portfolio 폴더 4개 대시보드 확인
3. cAdvisor 대시보드에서 `container_label_com_docker_compose_service` 라벨 노출 확인
4. Node Exporter Full 패널에 dev/prod 데이터 정상 출력 확인
