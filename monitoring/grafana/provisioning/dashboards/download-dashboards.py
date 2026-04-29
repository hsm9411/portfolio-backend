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
    (11835, "redis-dashboard"),
    (14282, "cadvisor"),
]


def patch_datasource(obj):
    """모든 prometheus datasource 참조를 provisioned UID로 교체."""
    if isinstance(obj, dict):
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


def patch_node_exporter_jobs(data: dict) -> dict:
    """
    Node Exporter Full(#1860)의 job 변수 regex를 우리 job 이름(node_exporter)에 맞게 수정.
    다른 대시보드에 적용해도 무해하다.
    """
    text = json.dumps(data)
    # 기본 regex 패턴을 node_exporter 포함으로 통일
    text = re.sub(
        r'"integrations/node_exporter\|node_exporter\|node\|nodeexporter"',
        '"node_exporter"',
        text,
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

    # 불필요한 import 메타 제거 (provisioning 시 문제 유발 가능)
    data.pop("__inputs", None)
    data.pop("__requires", None)
    data["id"] = None  # Grafana가 자동 할당

    data = patch_datasource(data)
    data = patch_node_exporter_jobs(data)

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
