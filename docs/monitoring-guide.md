# 모니터링 구성 전체 가이드

> 포트폴리오 백엔드의 Prometheus + Grafana 모니터링 스택을 처음부터 끝까지 설명합니다.
> "어떤 파일이 무엇을 하는가", "어떻게 새 메트릭/대시보드를 추가하는가",
> "장애가 났을 때 어디부터 보는가"를 한 흐름으로 정리합니다.
>
> **최종 업데이트: 2026-05-07 — cAdvisor v0.56.2 업그레이드 + Memory Cache 메트릭 정정 (BACK-67~69)**

---

## 목차

1. [전체 그림 한눈에 보기](#1-전체-그림-한눈에-보기)
2. [구성 요소별 역할](#2-구성-요소별-역할)
3. [파일 구조 — 어디에 무엇이 있는가](#3-파일-구조--어디에-무엇이-있는가)
4. [Prometheus 설정 — `prometheus.yml`](#4-prometheus-설정--prometheusyml)
5. [Grafana Provisioning — 자동 등록의 비밀](#5-grafana-provisioning--자동-등록의-비밀)
6. [대시보드 추가 흐름 — `download-dashboards.py`](#6-대시보드-추가-흐름--download-dashboardspy)
7. [CI/CD 배포 흐름 — `.github/workflows/deploy.yml`](#7-cicd-배포-흐름--githubworkflowsdeployyml)
8. [메트릭이 화면에 뜨기까지의 데이터 흐름](#8-메트릭이-화면에-뜨기까지의-데이터-흐름)
9. [실전 — 새 대시보드/메트릭 추가하기](#9-실전--새-대시보드메트릭-추가하기)
10. [트러블슈팅](#10-트러블슈팅)
11. [운영 체크리스트](#11-운영-체크리스트)

---

## 1. 전체 그림 한눈에 보기

```
┌──────────────────────────────────── Server 2 (Dev + Monitoring Hub) ────────────────────────────────────┐
│  152.67.216.145                                                                                          │
│                                                                                                          │
│   ┌──────────────┐   scrape (HTTP /metrics)                                                              │
│   │  Prometheus  │───────────────┐                                                                       │
│   │  :9090       │               │                                                                       │
│   │  (TSDB 30d)  │◀──────────────┼── pull every 15s                                                      │
│   └─────┬────────┘               │                                                                       │
│         │ Datasource             ▼                                                                       │
│         │                ┌────────────────────────┐  ┌────────────────────┐                              │
│         │                │ portfolio-backend-dev  │  │ node-exporter-dev  │                              │
│         │                │   :3000/metrics        │  │   :9100/metrics    │                              │
│         │                └────────────────────────┘  └────────────────────┘                              │
│         │                ┌────────────────────────┐  ┌────────────────────┐                              │
│         │                │ cadvisor-dev           │  │ nginx-exporter-dev │                              │
│         │                │   :8080/metrics        │  │   :9113/metrics    │                              │
│         │                └────────────────────────┘  └────────────────────┘                              │
│         │                ┌────────────────────────┐                                                      │
│         │                │ redis-exporter-dev     │                                                      │
│         │                │   :9121/metrics        │                                                      │
│         │                └────────────────────────┘                                                      │
│         ▼                                                                                                │
│   ┌──────────────┐                                                                                       │
│   │   Grafana    │   ← 사용자: https://hsm9411-dev.duckdns.org/grafana                                  │
│   │   :3000      │     (nginx /grafana 리버스 프록시)                                                   │
│   └──────────────┘                                                                                       │
└──────────────────────────────────────────────┬───────────────────────────────────────────────────────────┘
                                               │
                                               │  scrape (HTTPS /metrics + 10.0.0.34:9100, :8080)
                                               ▼
┌──────────────────── Server 1 (Prod) ────────────────────┐
│  158.180.75.205                                          │
│                                                          │
│   portfolio-backend (HTTPS via nginx /metrics)           │
│   portfolio-node-exporter   :9100  (host network)        │
│   portfolio-cadvisor        :8080                        │
└──────────────────────────────────────────────────────────┘
```

**핵심 원칙**

| 원칙 | 의미 |
|---|---|
| **Pull 모델** | Prometheus가 각 exporter의 `/metrics`를 주기적으로 긁어옴 (push 아님) |
| **모니터링은 Server 2에 모음** | Prometheus + Grafana는 dev 서버에 1세트만 운영 (1GB 무료 vCPU 자원 절약) |
| **Prod는 exporter만** | Server 1은 메트릭을 노출하기만 하고, 수집/저장/시각화는 Server 2가 담당 |
| **Provisioning** | Grafana 데이터소스/대시보드는 손으로 추가하지 않고 Git의 YAML/JSON으로 등록 |

---

## 2. 구성 요소별 역할

### 2-1. Prometheus

- **하는 일**: 정해진 주소들의 `/metrics`를 15초마다 HTTP GET으로 긁어와 시계열 DB(TSDB)에 저장.
- **저장 기간**: 30일 (`--storage.tsdb.retention.time=30d`).
- **외부 노출**: ❌ 없음. 컨테이너 네트워크 안에서만 grafana가 접근.
- **이미지**: `prom/prometheus:v2.55.0`
- **설정 파일**: `monitoring/prometheus/prometheus.yml`
- **Lifecycle API**: `--web.enable-lifecycle` 옵션으로 `POST /-/reload` 지원 → 재시작 없이 설정 갱신.

### 2-2. Grafana

- **하는 일**: Prometheus를 datasource로 두고 PromQL 결과를 대시보드로 그림.
- **외부 노출**: ✅ `https://hsm9411-dev.duckdns.org/grafana`. nginx가 `/grafana` 경로를 `portfolio-grafana:3000`으로 리버스 프록시.
- **이미지**: `grafana/grafana:11.3.0`
- **인증**: admin / `${GRAFANA_ADMIN_PASSWORD}` (GitHub Actions secret)
- **데이터/대시보드 영속화**:
  - DB는 `grafana-data` 볼륨에 저장 (사용자가 만든 변경사항은 여기에)
  - **provisioning은 read-only 마운트**. 그래서 Git 진실 원본이 항상 우선.

### 2-3. Exporter들 (메트릭을 만드는 쪽)

| Exporter | 무엇을 노출? | 컨테이너 | 포트 | 비고 |
|---|---|---|---|---|
| `node-exporter` | CPU/메모리/디스크/네트워크 (호스트 OS) | `portfolio-node-exporter[-dev]` | 9100 | host network 모드 — `/proc`, `/sys` 직접 마운트 |
| `cadvisor` | 컨테이너별 CPU/메모리/네트워크 | `portfolio-cadvisor[-dev]` | 8080 | docker.sock 마운트 필요. v0.56.2 (BACK-68) |
| `nginx-exporter` | nginx active/handled connections, requests | `portfolio-nginx-exporter-dev` | 9113 | `/stub_status` 페이지 파싱 |
| `redis-exporter` | Redis 메모리/keyspace/연결수 | `portfolio-redis-exporter-dev` | 9121 | `REDIS_ADDR` 환경변수 |
| **Backend `/metrics`** | NestJS 앱 메트릭 (HTTP 요청수, GC, heap 등) | `portfolio-backend[-dev]` | 3000 | `@willsoto/nestjs-prometheus` |

> **Backend 메트릭은 코드 한 줄로 켜진다.** `src/app.module.ts:48-53`에 `PrometheusModule.register({ path: '/metrics', defaultMetrics: { enabled: true } })`만 있으면 NestJS가 알아서 `/metrics`를 노출.

---

## 3. 파일 구조 — 어디에 무엇이 있는가

```
monitoring/
├── docker-compose.monitoring.yml    ← Server 2 — Prometheus + Grafana + 4개 exporter
├── docker-compose.exporters.yml     ← Server 1 — node-exporter + cadvisor만
├── prometheus/
│   └── prometheus.yml               ← scrape target 정의 (job_name, target, labels)
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml       ← Prometheus를 datasource로 등록 (uid: prometheus)
        └── dashboards/
            ├── dashboards.yml       ← Provider 설정 (어느 폴더의 JSON을 읽을지)
            ├── download-dashboards.py  ← grafana.com 커뮤니티 대시보드 다운로드+패치 스크립트
            └── json/
                ├── node-exporter-full.json     (#1860)
                ├── nginx-prometheus-exporter.json  (#12708)
                ├── redis-dashboard.json        (#763)
                └── cadvisor.json               (#14282)

.github/workflows/
├── deploy.yml                       ← develop→Server2, main→Server1 자동 배포
└── diagnose-cadvisor.yml            ← cAdvisor 진단용 (workflow_dispatch 전용, BACK-67)
```

**책임 분리**

| 파일 | "이걸 바꾸면" |
|---|---|
| `prometheus.yml` | 새 scrape target 추가/제거 |
| `grafana/provisioning/datasources/prometheus.yml` | datasource URL/UID 변경 |
| `grafana/provisioning/dashboards/dashboards.yml` | 대시보드 폴더 이름/스캔 주기 변경 |
| `grafana/provisioning/dashboards/json/*.json` | 대시보드 자체 (자동 반영, 30초 폴링) |
| `download-dashboards.py` | 새 커뮤니티 대시보드 등록 / 기존 패치 로직 수정 |
| `docker-compose.monitoring.yml` | exporter/grafana/prometheus 이미지·옵션 변경 |
| `.github/workflows/deploy.yml` | 배포 스텝 (어떤 파일을 어디로 scp 할지) |

---

## 4. Prometheus 설정 — `prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # 앱 메트릭
  - job_name: backend-dev
    static_configs:
      - targets: ['portfolio-backend-dev:3000']
        labels:
          server: dev

  - job_name: backend-prod
    scheme: https
    metrics_path: /metrics
    static_configs:
      - targets: ['hsm9411.duckdns.org']
        labels:
          server: prod

  # 시스템 메트릭 — node-exporter (server 라벨로 dev/prod 구분)
  - job_name: node_exporter
    static_configs:
      - targets: ['10.0.0.196:9100']
        labels: { server: dev }
      - targets: ['10.0.0.34:9100']
        labels: { server: prod }

  # 컨테이너 메트릭 — cAdvisor
  - job_name: cadvisor
    static_configs:
      - targets: ['cadvisor:8080']
        labels: { server: dev }
      - targets: ['10.0.0.34:8080']
        labels: { server: prod }

  # nginx (dev 전용)
  - job_name: nginx
    static_configs:
      - targets: ['portfolio-nginx-exporter-dev:9113']
        labels: { server: dev }

  # Redis (dev 전용)
  - job_name: redis_exporter
    static_configs:
      - targets: ['portfolio-redis-exporter-dev:9121']
        labels: { server: dev }
```

**왜 이런 구조인가?**

| 결정 | 이유 |
|---|---|
| **`job_name`을 커뮤니티 대시보드 컨벤션에 맞춤** (`node_exporter`, `cadvisor`, `redis_exporter`) | 대시보드 변수의 기본 regex가 그 이름을 가정. 다르게 짓고 나서 패치하는 것보다 처음부터 맞추는 게 싸다. |
| **Server 라벨 분리** (`server: dev` / `server: prod`) | 같은 메트릭(예: `node_cpu_seconds_total`)을 두 서버에서 수집하는데, 라벨로 구분하지 않으면 같은 series로 합쳐져 그래프가 이상해짐. |
| **Prod는 IP 직접, Dev는 컨테이너 이름** | Server 2 내부의 다른 컨테이너는 docker DNS로 이름 해석 가능 / Prod는 다른 호스트라 사설 IP로 직접 |
| **Prod backend는 `https` + 도메인** | Server 1의 backend는 nginx 뒤에 있어 컨테이너에 직접 접근 못함. 도메인 + HTTPS로 `/metrics`를 받음. |

**적용 흐름**: `prometheus.yml` 수정 → `git push develop` → CI가 scp로 Server 2에 복사 → `POST /-/reload` 호출 → Prometheus가 재시작 없이 새 설정 반영.

---

## 5. Grafana Provisioning — 자동 등록의 비밀

Grafana는 시작할 때 `/etc/grafana/provisioning/` 디렉토리를 스캔한다. **이 디렉토리에 YAML/JSON을 넣어두면 알아서 등록된다.** (수동 클릭 불필요)

### 5-1. Datasource 등록 (`datasources/prometheus.yml`)

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    uid: prometheus              # ← 대시보드 JSON에서 이 UID로 참조
    type: prometheus
    access: proxy                # Grafana 백엔드가 대신 쿼리
    url: http://prometheus:9090  # docker network 내부 주소
    isDefault: true
    editable: false              # UI에서 수정 못 막음 (Git이 진실원본)
    jsonData:
      timeInterval: 15s
      httpMethod: POST
```

**중요한 부분**: `uid: prometheus`. 모든 대시보드 JSON이 이 UID를 가리키도록 `download-dashboards.py`가 패치한다.

### 5-2. Dashboard Provider (`dashboards/dashboards.yml`)

```yaml
apiVersion: 1

providers:
  - name: portfolio
    orgId: 1
    folder: Portfolio              # ← Grafana UI에서 보일 폴더 이름
    type: file
    disableDeletion: false
    editable: true                 # UI에서 수정 가능 (단 재시작/30초 후 Git 버전으로 덮어씀)
    updateIntervalSeconds: 30      # 30초마다 json/ 폴더 스캔
    options:
      path: /etc/grafana/provisioning/dashboards/json
```

**`updateIntervalSeconds: 30`이 왜 중요한가?**
배포 후 새 JSON이 들어가면 30초 안에 자동으로 반영됨. **Grafana 컨테이너 재시작 불필요.**

---

## 6. 대시보드 추가 흐름 — `download-dashboards.py`

커뮤니티 대시보드를 그대로 가져다 쓰면 보통 안 된다. 이유는 다음 중 하나 이상:

1. `${DS_PROMETHEUS}` 같은 placeholder uid → provisioned uid (`prometheus`)로 교체 필요
2. `singlestat` / `graph` 같은 deprecated 패널 → Grafana 11.x에서는 `stat` / `timeseries`로 교체 필요
3. job_name 가정이 다름 (예: `integrations/node_exporter` 가정 → 우리 환경은 `node_exporter`)
4. Kubernetes 전용 라벨(`namespace`)을 쓰는데 우리는 Docker
5. cgroupv2 환경에서 `name` 라벨이 비거나 `container_memory_cache`가 없음

### 6-1. 스크립트가 하는 일

```python
DASHBOARDS = [
    (1860,  "node-exporter-full"),
    (12708, "nginx-prometheus-exporter"),
    (763,   "redis-dashboard"),
    (14282, "cadvisor"),
]
```

각 ID에 대해:

```
[grafana.com API] GET /api/dashboards/{id}/revisions/latest/download
       │
       ▼
[공통 패치]
  - __inputs/__elements/__requires 제거
  - id = null (Grafana가 자동 할당)
  - dict 형식 datasource.uid → "prometheus"
  - string 형식 "${DS_...}" → {"type": "prometheus", "uid": "prometheus"}
  - "integrations/node_exporter|node_exporter|..." regex → "node_exporter"
       │
       ▼
[대시보드별 추가 패치]
  ├─ 1860 (Node Exporter Full)
  │    - ds_prometheus 변수 current 명시
  │    - job 변수 regex = "node_exporter" 고정
  │
  ├─ 763 (Redis)
  │    - namespace 변수 제거 (Kubernetes 전용)
  │    - instance 쿼리 → label_values(redis_up, instance)
  │
  ├─ 14282 (cAdvisor)
  │    - DS_PROMETHEUS 변수 추가 (원본에 없음)
  │    - host 쿼리 → label_values(container_cpu_usage_seconds_total, instance)
  │    - container 쿼리 → container_label_com_docker_compose_service 라벨 사용
  │    - graph → timeseries 변환
  │    - container_memory_cache → inactive_file + active_file 합산 (cgroupv2)
  │
  └─ 12708 (nginx)
       - DS_PROMETHEUS current 명시
       - singlestat → stat 변환
       - graph → timeseries 변환
       │
       ▼
[json/{name}.json 저장]
       │
       ▼
[git add + commit + push]
       │
       ▼
[CI/CD가 Server 2로 scp]
       │
       ▼
[Grafana 30초 폴링이 픽업 → 자동 반영]
```

### 6-2. 새 대시보드 추가하기

```python
# download-dashboards.py 의 DASHBOARDS 리스트에 추가
DASHBOARDS = [
    (1860,  "node-exporter-full"),
    (12708, "nginx-prometheus-exporter"),
    (763,   "redis-dashboard"),
    (14282, "cadvisor"),
    (XXXXX, "your-new-dashboard"),   # ← 추가
]
```

```bash
cd monitoring/grafana/provisioning/dashboards
python3 download-dashboards.py

# json/your-new-dashboard.json 이 생성됨
# Grafana UI에서 미리 확인하고 싶다면:
docker compose -f monitoring/docker-compose.monitoring.yml restart grafana

# 만족스러우면
git add monitoring/grafana/provisioning/dashboards/json/your-new-dashboard.json
git add monitoring/grafana/provisioning/dashboards/download-dashboards.py
git commit -m "feat(BACK-N): your-new-dashboard 추가"
```

> **데이터 미스매치가 있으면** `download-dashboards.py`에 그 대시보드 ID 분기를 추가해서 패치 함수를 호출하도록 한다. 단발성으로 JSON을 손으로 고치지 말 것 — 다음 번 다운로드 시 사라진다.

---

## 7. CI/CD 배포 흐름 — `.github/workflows/deploy.yml`

```
┌─────────────────────────────────────────────────────────────────────┐
│  push develop                                                        │
│      │                                                               │
│      ▼                                                               │
│  [Job 1: lint]  ──fail──▶ STOP                                       │
│      │ ok                                                            │
│      ▼                                                               │
│  [Job 2: build-and-push]  Docker image → ghcr.io:develop            │
│      │                                                               │
│      ▼                                                               │
│  [Job 4: deploy-dev]  Server 2로 ssh                                │
│      ├─ Nginx 파일 scp + reload                                     │
│      ├─ docker-compose.dev.yml scp + ./deploy.sh (backend 갱신)     │
│      └─ ★ monitoring 배포 ★                                          │
│           ├─ ~/monitoring/{prometheus,grafana/...} 디렉토리 보장    │
│           ├─ docker-compose.monitoring.yml scp                      │
│           ├─ prometheus.yml scp                                     │
│           ├─ datasources/prometheus.yml scp                         │
│           ├─ dashboards.yml scp                                     │
│           ├─ json/*.json (4개) scp                                  │
│           ├─ .env (GRAFANA_ADMIN_PASSWORD) scp                      │
│           ├─ docker compose up -d                                   │
│           └─ POST /-/reload  (Prometheus 무중단 설정 갱신)          │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  push main                                                           │
│      │                                                               │
│      ▼                                                               │
│  [lint] ▶ [build :latest] ▶ [deploy-prod]                           │
│      └─ Server 1: backend + nginx + ★ exporters만 (cadvisor, node) ★│
│         ※ Prometheus/Grafana는 Server 1에 없음                       │
└─────────────────────────────────────────────────────────────────────┘
```

**핵심**: monitoring 스택은 develop에 push할 때만 배포된다. prod 릴리즈 시(develop→main 머지)에는 **Server 1의 exporter만** 갱신됨. Prometheus/Grafana는 Server 2에 그대로 남아있고 그쪽으로 metrics가 흘러간다.

> **그래서 cAdvisor 같은 monitoring 변경은 develop 푸시 즉시 dev에서 검증 가능.** prod 적용은 develop→main 릴리즈 PR에서 같이 묶여 나간다.

---

## 8. 메트릭이 화면에 뜨기까지의 데이터 흐름

예: 사용자가 Grafana에서 "Node Exporter Full" 대시보드의 CPU 패널을 본다.

```
[브라우저]
   │ 1. https://hsm9411-dev.duckdns.org/grafana/d/.../node-exporter-full
   ▼
[nginx (Server 2)]   /grafana → portfolio-grafana:3000  (proxy_pass)
   │
   ▼
[Grafana]
   │ 2. 패널 PromQL 쿼리: avg(rate(node_cpu_seconds_total{...}[5m]))
   │
   │ 3. datasource(uid=prometheus) → http://prometheus:9090/api/v1/query_range
   ▼
[Prometheus]  ── 4. TSDB 조회 ──▶ 결과 반환
   │
   │ 5. 이 series는 어디서 왔나? 15초마다 다음 작업이 돌고 있었음:
   │
   │      ┌─ scrape job_name=node_exporter ─┐
   │      │   GET 10.0.0.196:9100/metrics    │  (server: dev)
   │      │   GET 10.0.0.34:9100/metrics     │  (server: prod)
   │      └──────────────────────────────────┘
   │
   ▼
[node-exporter]
   - /proc, /sys 마운트 → CPU/Mem/Disk 카운터를 prometheus 텍스트 포맷으로 노출
```

**데이터의 단방향 흐름** (push가 아닌 **pull**):
- Exporter는 메트릭을 만들어 **HTTP로 노출만** 한다.
- Prometheus는 **pull**로 끌어가서 저장한다.
- Grafana는 Prometheus에 PromQL을 날려 **on-demand로 그린다**. (대시보드는 데이터를 들고 있지 않다.)

---

## 9. 실전 — 새 대시보드/메트릭 추가하기

### 9-1. 시나리오 A — 백엔드에 커스텀 메트릭 추가

예: "POST /posts 요청 수를 카운트"

```typescript
// src/modules/posts/posts.controller.ts
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Controller('posts')
export class PostsController {
  constructor(
    @InjectMetric('posts_created_total')
    private readonly postsCreatedCounter: Counter<string>,
  ) {}

  @Post()
  async create(...) {
    this.postsCreatedCounter.inc();
    ...
  }
}

// posts.module.ts
import { makeCounterProvider } from '@willsoto/nestjs-prometheus';

@Module({
  providers: [
    makeCounterProvider({
      name: 'posts_created_total',
      help: '생성된 게시물 누적 수',
    }),
    ...
  ],
})
```

**추가로 할 일이 없다.** `prometheus.yml`의 `backend-dev` job이 이미 `/metrics`를 긁고 있으므로 다음 push에서 자동 수집. Grafana에서 새 패널 만들 때 PromQL `rate(posts_created_total[5m])`로 사용.

### 9-2. 시나리오 B — 새 exporter 추가 (예: PostgreSQL exporter)

1. `monitoring/docker-compose.monitoring.yml`에 서비스 추가
   ```yaml
   postgres-exporter:
     image: prometheuscommunity/postgres-exporter:v0.15.0
     environment:
       - DATA_SOURCE_NAME=...
     expose: ["9187"]
     networks: [monitoring]
   ```

2. `monitoring/prometheus/prometheus.yml`에 scrape 추가
   ```yaml
   - job_name: postgres_exporter
     static_configs:
       - targets: ['postgres-exporter:9187']
         labels: { server: dev }
   ```

3. `download-dashboards.py`의 `DASHBOARDS`에 PostgreSQL 대시보드 ID 추가 (예: 9628)
   ```python
   (9628, "postgres-exporter"),
   ```

4. `python3 download-dashboards.py` → JSON 생성 확인

5. `git commit + push develop` → CI가 자동 배포

### 9-3. 시나리오 C — 기존 대시보드 패널 수정

**원칙: Grafana UI에서 직접 고치지 말 것.** 30초 후 Git 버전으로 덮어쓰여서 사라진다.

올바른 흐름:
1. `monitoring/grafana/provisioning/dashboards/json/{name}.json`을 직접 편집,
   또는 `download-dashboards.py`에 패치 함수 추가 후 재실행
2. Git 커밋 → develop push → CI 배포 → 30초 안에 반영

> **예외**: 탐색 단계에서 "이게 맞는 PromQL인지" 시험하고 싶을 때는 UI에서 일시적으로 바꿔봐도 된다. 마음에 들면 그 PromQL을 JSON 파일에 옮겨 적고 커밋한다.

---

## 10. 트러블슈팅

### 10-1. "패널에 No data가 뜬다"

**디버깅 순서**:

```
1. Prometheus에서 메트릭이 존재하나?
   → kubectl/ssh로 Server 2 접속 → docker exec -it portfolio-prometheus wget -qO- 'http://localhost:9090/api/v1/targets' | jq
   → 또는 Grafana → Explore → Prometheus 선택 → 메트릭 이름 입력

2. Target이 UP인가?
   → Prometheus의 /targets 페이지 (외부에 안 열려있어도 docker exec로 확인 가능)

3. UP인데 metric이 없다면 → 메트릭 이름이 cAdvisor/exporter 버전 사이에 바뀌었을 수 있음
   (BACK-69 사례: container_memory_cache → container_memory_(active|inactive)_file_bytes)

4. Grafana 패널의 datasource UID가 'prometheus'가 맞나?
   → JSON 직접 확인 (download-dashboards.py가 패치하긴 하지만 직접 추가한 경우 빠짐)
```

### 10-2. "대시보드 변경이 반영 안 됨"

| 증상 | 원인 | 해결 |
|---|---|---|
| 30초 지나도 그대로 | 파일이 Server 2에 도달 못 함 | GitHub Actions 로그에서 scp 단계 확인 |
| 일부 패널만 안 바뀜 | UI에서 직접 수정한 게 DB에 남아있음 | UI에서 "Reload" 또는 Grafana 재시작 |
| Datasource 에러 | uid가 안 맞음 | JSON 안의 datasource.uid가 모두 `prometheus`인지 grep |

### 10-3. "Prometheus 설정 변경했는데 안 먹음"

```bash
# CI가 자동으로 호출하지만 수동 확인이 필요할 때
docker exec portfolio-prometheus wget -qO- --post-data='' http://localhost:9090/-/reload
```

설정에 syntax 에러가 있으면 reload가 실패하고 **이전 설정이 그대로 남는다** (안전장치). 컨테이너 로그로 확인:
```bash
docker logs portfolio-prometheus --tail 50
```

### 10-4. cAdvisor 컨테이너 라벨이 안 보임

이 케이스는 BACK-67~68에서 다 해결했지만 다시 발생할 수 있는 패턴:

- **증상**: `container_label_com_docker_compose_service`가 빈 값 → 대시보드의 container 변수 드롭다운이 비어있음
- **원인 후보**:
  1. cAdvisor의 docker client API 버전이 host docker engine보다 낮음 → factory 등록 실패
  2. cAdvisor 컨테이너가 `/var/run/docker.sock`에 접근 못함 (privileged/volume 누락)
- **확인 방법**: `.github/workflows/diagnose-cadvisor.yml`을 workflow_dispatch로 실행 → artifact에서 cAdvisor 로그/`docker info`/API 응답 확인

자세한 사후 분석: [memory: project_cadvisor_label_diagnosis.md](../../../Users/hasun/.claude/projects/C--hsm9411-portfolio-backend/memory/project_cadvisor_label_diagnosis.md)

---

## 11. 운영 체크리스트

### 11-1. 매번 develop에 monitoring 변경을 push할 때

- [ ] `npm run lint` (백엔드 코드를 같이 바꿨다면)
- [ ] 변경 의도가 commit message에 명확히 (예: `fix(BACK-69): cAdvisor Memory Cache 메트릭 이름 정정`)
- [ ] CI 통과 확인
- [ ] 배포 후 Grafana에서 영향받은 패널 시각 확인 (30초 후)

### 11-2. develop → main 릴리즈 시 (monitoring 변경 포함된 경우)

- [ ] develop에서 모든 패널 정상 확인
- [ ] Server 1의 docker engine 버전이 cAdvisor와 호환되는지 확인 (`docker version`)
- [ ] 머지 후 deploy-prod 로그에서 `monitoring/docker-compose.exporters.yml` scp 단계 통과 확인
- [ ] Grafana에서 server=prod 라벨 데이터 들어오는지 확인

### 11-3. 새 대시보드 추가 PR 체크리스트

- [ ] `download-dashboards.py`의 `DASHBOARDS`에 등록
- [ ] 필요한 패치 함수 추가 (datasource UID, job regex, 라벨 매핑 등)
- [ ] 로컬에서 스크립트 실행 → JSON 생성 확인
- [ ] (옵션) 로컬 docker compose로 Grafana 띄워 미리보기
- [ ] PR에 스크린샷 첨부

### 11-4. 정기 점검 (월 1회 권장)

- [ ] Prometheus 디스크 사용량 (30d 보존이지만 카디널리티 폭증 시 빨리 참)
- [ ] 각 대시보드의 No data 패널 점검
- [ ] grafana.com에서 사용 중인 대시보드 ID에 새 revision이 있는지 확인 → 필요하면 `download-dashboards.py` 재실행
- [ ] cAdvisor / node-exporter / nginx-exporter 새 minor 버전 릴리즈 노트 확인

---

## 부록 A — 주요 URL/명령어 모음

| 무엇 | URL/명령 |
|---|---|
| Grafana 대시보드 | https://hsm9411-dev.duckdns.org/grafana |
| Prometheus 설정 reload | `docker exec portfolio-prometheus wget -qO- --post-data='' http://localhost:9090/-/reload` |
| Prometheus targets 확인 | `docker exec portfolio-prometheus wget -qO- http://localhost:9090/api/v1/targets` |
| 백엔드 메트릭 직접 확인 (dev) | `docker exec portfolio-backend-dev wget -qO- http://localhost:3000/metrics \| head` |
| 대시보드 다운로드/패치 | `python3 monitoring/grafana/provisioning/dashboards/download-dashboards.py` |
| cAdvisor 진단 워크플로 | GitHub Actions → "Diagnose cAdvisor" → Run workflow |

## 부록 B — 사용 중인 커뮤니티 대시보드

| Grafana ID | 이름 | URL |
|---|---|---|
| 1860 | Node Exporter Full | https://grafana.com/grafana/dashboards/1860 |
| 12708 | NGINX Prometheus Exporter | https://grafana.com/grafana/dashboards/12708 |
| 763 | Redis Dashboard for Prometheus | https://grafana.com/grafana/dashboards/763 |
| 14282 | cAdvisor exporter | https://grafana.com/grafana/dashboards/14282 |

## 부록 C — 자주 쓰는 PromQL 예시

```promql
# CPU 사용률(%) — 호스트별
100 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100

# 메모리 사용률(%) — 호스트별
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100

# 컨테이너별 CPU 사용률 (cAdvisor + Docker Compose 라벨)
sum by (container_label_com_docker_compose_service) (
  rate(container_cpu_usage_seconds_total{container_label_com_docker_compose_service!=""}[5m])
)

# 백엔드 5xx 발생률
sum(rate(http_requests_total{status=~"5..", job="backend-dev"}[5m]))

# Redis 메모리 사용률(%)
redis_memory_used_bytes / redis_memory_max_bytes * 100

# nginx active connections
nginx_connections_active
```
