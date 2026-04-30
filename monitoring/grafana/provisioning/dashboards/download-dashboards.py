#!/usr/bin/env python3
"""
커뮤니티 Grafana 대시보드 다운로드 + 패치 스크립트.

사용법:
  python3 download-dashboards.py

json/ 폴더에 패치된 JSON이 저장된다.
이후 git add + commit → CI/CD 배포 시 Grafana가 자동 로드.
"""

import json
import os
import re
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_DIR = os.path.join(SCRIPT_DIR, "json")
DATASOURCE_UID = "prometheus"

# (grafana.com dashboard ID, 저장 파일명)
DASHBOARDS = [
    (1860,  "node-exporter-full"),
    (12708, "nginx-prometheus-exporter"),
    (763,   "redis-dashboard"),   # Docker 환경용 (#11835은 Kubernetes 전용이므로 사용 불가)
    (14282, "cadvisor"),
]


def patch_datasource(obj):
    """모든 prometheus datasource 참조를 provisioned UID로 교체 (dict/list 형식)."""
    if isinstance(obj, dict):
        # 신형 dict format: {"type": "prometheus", "uid": "${DS_...}"}
        if obj.get("type") == "prometheus" and "uid" in obj:
            obj["uid"] = DATASOURCE_UID
        elif isinstance(obj.get("uid"), str) and obj["uid"].startswith("${DS_"):
            obj["uid"] = DATASOURCE_UID
        for v in obj.values():
            patch_datasource(v)
    elif isinstance(obj, list):
        for item in obj:
            patch_datasource(item)
    return obj


def patch_string_datasource_refs(data: dict) -> dict:
    """구형 string format datasource 참조 ('${DS_...}') → UID dict로 교체.

    cadvisor/nginx 계열 대시보드가 panel datasource를 string으로 저장하는 경우를 처리한다.
    patch_datasource는 dict 형식만 다루므로 string 형식은 별도 처리가 필요하다.
    """
    text = json.dumps(data)
    text = re.sub(
        r'"datasource"\s*:\s*"\$\{DS_[^}]+\}"',
        f'"datasource": {{"type": "prometheus", "uid": "{DATASOURCE_UID}"}}',
        text,
    )
    return json.loads(text)


def patch_ds_current(data, var_name="DS_PROMETHEUS"):
    """데이터소스 template 변수의 current를 provisioned datasource로 명시."""
    for var in data.get("templating", {}).get("list", []):
        if var.get("name") == var_name and var.get("type") == "datasource":
            var["current"] = {"selected": False, "text": "Prometheus", "value": DATASOURCE_UID}
    return data


def ensure_datasource_var(data, var_name="DS_PROMETHEUS"):
    """지정된 datasource template 변수가 없으면 templating 목록 앞에 추가."""
    templating = data.setdefault("templating", {})
    vars_list = templating.setdefault("list", [])
    if any(v.get("name") == var_name for v in vars_list):
        return data
    ds_var = {
        "current": {"selected": False, "text": "Prometheus", "value": DATASOURCE_UID},
        "hide": 0,
        "includeAll": False,
        "label": "Datasource",
        "multi": False,
        "name": var_name,
        "options": [],
        "query": "prometheus",
        "refresh": 1,
        "regex": "",
        "skipUrlSync": False,
        "type": "datasource",
    }
    vars_list.insert(0, ds_var)
    return data


def patch_redis_template_vars(data):
    """Redis 대시보드 template 변수를 Docker 환경(namespace 라벨 없음)에 맞게 수정."""
    vars_list = data.get("templating", {}).get("list", [])

    # namespace 변수 제거 (Kubernetes 전용 라벨 — Docker에서는 비어 있어 instance 조회도 막힘)
    vars_list = [v for v in vars_list if v.get("name") != "namespace"]

    # instance 변수: namespace 의존성 제거 → redis_up에서 직접 조회
    for v in vars_list:
        if v.get("name") == "instance":
            simple_query = "label_values(redis_up, instance)"
            v["definition"] = simple_query
            if isinstance(v.get("query"), dict):
                v["query"]["query"] = simple_query
            else:
                v["query"] = simple_query

    data["templating"]["list"] = vars_list
    return data


def patch_node_exporter_jobs(data: dict) -> dict:
    """
    Node Exporter Full(#1860)의 job 변수 regex를 우리 job 이름(node_exporter)에 맞게 수정.
    다른 대시보드에 적용해도 무해하다.
    """
    text = json.dumps(data)
    text = re.sub(
        r'"integrations/node_exporter\|node_exporter\|node\|nodeexporter"',
        '"node_exporter"',
        text,
    )
    return json.loads(text)


def patch_node_exporter_job_regex(data: dict) -> dict:
    """Node Exporter Full job 변수 regex를 node_exporter로 고정.

    Prometheus job_name=node_exporter 하나만 존재하므로 regex 명시.
    이 설정이 없으면 드롭다운에 다른 job이 섞일 수 있음.
    """
    for var in data.get("templating", {}).get("list", []):
        if var.get("name") == "job" and var.get("type") == "query":
            var["regex"] = "node_exporter"
    return data


_VALUENAME_TO_CALC = {
    "current": "lastNotNull",
    "last":    "last",
    "avg":     "mean",
    "total":   "sum",
    "max":     "max",
    "min":     "min",
    "first":   "first",
    "count":   "count",
    "delta":   "delta",
    "diff":    "diff",
}

_SINGLESTAT_ONLY_KEYS = {
    "colorBackground", "colorValue", "colorPrefix", "colorPostfix",
    "format", "valueName", "valueMaps", "valueFontSize",
    "prefixFontSize", "postfixFontSize", "prefix", "postfix",
    "sparkline", "thresholds", "colors", "mappingType", "mappingTypes",
    "rangeMaps", "tableColumn", "gauge", "nullText", "nullPointMode",
}

_GRAPH_YAXIS_FORMAT_TO_UNIT = {
    "percent": "percent",
    "percentunit": "percentunit",
    "bytes": "bytes",
    "kbytes": "kbytes",
    "Bps": "Bps",
    "bps": "bps",
    "short": "short",
    "ms": "ms",
    "s": "s",
    "none": "none",
}

_GRAPH_ONLY_KEYS = {
    "yaxes", "yaxis", "xaxis", "aliasColors", "bars", "dashes",
    "dashLength", "fill", "fillGradient", "lines", "linewidth",
    "nullPointMode", "percentage", "points", "pointradius",
    "renderer", "seriesOverrides", "spaceLength", "stack",
    "steppedLine", "thresholds", "timeRegions", "paceLength",
    "legend",
}


def convert_singlestat_to_stat(data: dict) -> dict:
    """deprecated 'singlestat' 패널을 modern 'stat' 패널로 변환.

    Grafana 11.x에서 Angular 기반 singlestat 렌더링이 제거되었으므로
    React 기반 stat 패널로 변환한다.
    colorBackground/Value, thresholds(colors), valueMaps를 이전.
    """
    for panel in data.get("panels", []):
        if panel.get("type") != "singlestat":
            continue

        unit = panel.get("format", "short")
        calc = _VALUENAME_TO_CALC.get(panel.get("valueName", "current"), "lastNotNull")

        color_mode = "none"
        if panel.get("colorBackground"):
            color_mode = "background"
        elif panel.get("colorValue"):
            color_mode = "value"

        colors = panel.get("colors", ["green", "orange", "red"])
        threshold_str = panel.get("thresholds", "")
        threshold_values = []
        for v in threshold_str.split(","):
            v = v.strip()
            if v:
                try:
                    threshold_values.append(float(v))
                except ValueError:
                    pass

        # 같은 임계값에 여러 색상이 있을 때 마지막 색상 우선 (더 높은 범위 색상 사용)
        step_map: dict = {None: colors[0]}
        for i, tv in enumerate(threshold_values):
            idx = i + 1
            if idx < len(colors):
                step_map[tv] = colors[idx]

        steps = sorted(
            [{"color": c, "value": v} for v, c in step_map.items()],
            key=lambda s: (s["value"] is not None, s["value"] or 0),
        )

        mappings = []
        value_maps = panel.get("valueMaps", [])
        if value_maps:
            options = {
                vm["value"]: {"text": vm["text"], "index": i}
                for i, vm in enumerate(value_maps)
                if vm.get("op") == "="
            }
            if options:
                mappings.append({"type": "value", "options": options})

        panel["type"] = "stat"
        panel["fieldConfig"] = {
            "defaults": {
                "color": {"mode": "thresholds"},
                "mappings": mappings,
                "thresholds": {"mode": "absolute", "steps": steps},
                "unit": unit,
            },
            "overrides": [],
        }
        panel["options"] = {
            "colorMode": color_mode,
            "graphMode": "none",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
                "calcs": [calc],
                "fields": "",
                "values": False,
            },
            "textMode": "auto",
        }

        for key in list(panel.keys()):
            if key in _SINGLESTAT_ONLY_KEYS:
                del panel[key]

    return data


def convert_graph_to_timeseries(data: dict) -> dict:
    """deprecated 'graph' 패널을 modern 'timeseries' 패널로 변환.

    Grafana 11.x에서 Angular 기반 graph 패널 렌더링이 불안정하므로
    timeseries 패널로 변환하여 안정적인 React 기반 렌더링을 사용.
    yaxes[0].format을 fieldConfig.defaults.unit으로 이전.
    """
    for panel in data.get("panels", []):
        if panel.get("type") != "graph":
            continue

        unit = "short"
        yaxes = panel.get("yaxes", [])
        if yaxes and isinstance(yaxes[0], dict):
            fmt = yaxes[0].get("format", "short")
            unit = _GRAPH_YAXIS_FORMAT_TO_UNIT.get(fmt, fmt)

        panel["type"] = "timeseries"
        panel["fieldConfig"] = {
            "defaults": {
                "color": {"mode": "palette-classic"},
                "custom": {
                    "lineInterpolation": "linear",
                    "lineWidth": 1,
                    "fillOpacity": 10,
                    "gradientMode": "none",
                    "showPoints": "never",
                    "spanNulls": False,
                },
                "unit": unit,
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [{"color": "green", "value": None}],
                },
            },
            "overrides": [],
        }
        panel["options"] = {
            "tooltip": {"mode": "multi", "sort": "none"},
            "legend": {"displayMode": "list", "placement": "bottom"},
        }

        for key in list(panel.keys()):
            if key in _GRAPH_ONLY_KEYS:
                del panel[key]

    return data


def patch_cadvisor_for_docker_compose(data: dict) -> dict:
    """cAdvisor 대시보드를 Docker Compose 서비스 라벨 기반으로 수정.

    cAdvisor 설정에 --whitelisted_container_labels=com.docker.compose.service가 있으므로
    container_label_com_docker_compose_service 라벨이 항상 존재.
    cgroupv2+systemd 환경에서 불안정한 name 라벨 대신 이 라벨을 사용.
    """
    # container 변수 쿼리: name 라벨 → container_label_com_docker_compose_service
    # container_last_seen 대신 container_cpu_usage_seconds_total 사용 (cAdvisor 버전 불문 안정적)
    for var in data.get("templating", {}).get("list", []):
        if var.get("name") == "container" and var.get("type") == "query":
            new_query = (
                "label_values(container_cpu_usage_seconds_total"
                "{container_label_com_docker_compose_service!=\"\","
                "instance=~\"$host\"}, container_label_com_docker_compose_service)"
            )
            var["definition"] = new_query
            if isinstance(var.get("query"), dict):
                var["query"]["query"] = new_query
            else:
                var["query"] = new_query
            var["multi"] = True
            var["includeAll"] = True
            var["current"] = {"selected": True, "text": "All", "value": "$__all"}

    # 패널 쿼리: name=~"$container" → container_label_com_docker_compose_service=~"$container"
    text = json.dumps(data)
    text = text.replace(
        'name=~\\"$container\\"',
        'container_label_com_docker_compose_service=~\\"$container\\"',
    )
    # name=~".+" → container_label_com_docker_compose_service!="" (루트/시스템 컨테이너 제외)
    text = text.replace(
        ',name=~\\".+\\"',
        ',container_label_com_docker_compose_service!=\\"\\"',
    )
    # by (name) → by (container_label_com_docker_compose_service) (cgroupv2에서 name 라벨 없음)
    text = text.replace(
        ') by (name)',
        ') by (container_label_com_docker_compose_service)',
    )
    # legendFormat: {{name}} → {{container_label_com_docker_compose_service}}
    text = text.replace(
        '"legendFormat": "{{name}}"',
        '"legendFormat": "{{container_label_com_docker_compose_service}}"',
    )
    return json.loads(text)


def download_dashboard(dashboard_id: int, name: str) -> bool:
    url = f"https://grafana.com/api/dashboards/{dashboard_id}/revisions/latest/download"
    print(f"  Downloading #{dashboard_id} ({name})...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/7.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
    except Exception as exc:
        print(f"  ERROR: {exc}")
        return False

    # 불필요한 import 메타 제거
    data.pop("__inputs", None)
    data.pop("__elements", None)
    data.pop("__requires", None)
    data["id"] = None  # Grafana가 자동 할당

    data = patch_datasource(data)            # dict format uid 패치
    data = patch_string_datasource_refs(data) # string format datasource 패치
    data = patch_node_exporter_jobs(data)

    # 대시보드별 추가 패치
    if dashboard_id == 1860:
        # node-exporter: 소문자 ds_prometheus 변수 current 명시 + job regex 고정
        data = patch_ds_current(data, "ds_prometheus")
        data = patch_node_exporter_job_regex(data)
    elif dashboard_id == 763:
        # Redis: Docker 환경용으로 namespace 변수 제거 + DS_PROM current 명시
        data = patch_redis_template_vars(data)
        data = patch_ds_current(data, "DS_PROM")
    elif dashboard_id == 14282:
        # cAdvisor: DS_PROMETHEUS 변수 추가 + current 명시 + Docker Compose 라벨 기반으로 수정
        #           + deprecated graph 패널 → timeseries 변환 (Grafana 11.x 호환)
        data = ensure_datasource_var(data, "DS_PROMETHEUS")
        data = patch_ds_current(data, "DS_PROMETHEUS")
        data = patch_cadvisor_for_docker_compose(data)
        data = convert_graph_to_timeseries(data)
    elif dashboard_id == 12708:
        # nginx: DS_PROMETHEUS current 값 명시
        #        + deprecated singlestat → stat, graph → timeseries (Grafana 11.x 호환)
        data = patch_ds_current(data, "DS_PROMETHEUS")
        data = convert_singlestat_to_stat(data)
        data = convert_graph_to_timeseries(data)

    out_path = os.path.join(JSON_DIR, f"{name}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved → json/{name}.json")
    return True


def main():
    os.makedirs(JSON_DIR, exist_ok=True)
    print(f"Grafana 대시보드 다운로드 시작 ({len(DASHBOARDS)}개)\n")

    ok, fail = 0, 0
    for did, name in DASHBOARDS:
        if download_dashboard(did, name):
            ok += 1
        else:
            fail += 1

    print(f"\n완료: {ok}개 성공 / {fail}개 실패")
    if ok > 0:
        print("다음 단계: git add monitoring/grafana/provisioning/dashboards/json/ && git commit")


if __name__ == "__main__":
    main()
