from __future__ import annotations

import json
import os
import re
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler
from typing import Any

NEIS_SCHOOL_INFO_URL = "https://open.neis.go.kr/hub/schoolInfo"
SEOUL_OFFICE_CODE = "B10"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def normalize_school_key(value: str) -> str:
    value = clean_text(value)
    value = re.sub(r"\s+", "", value)
    value = re.sub(r"학교$", "", value)
    value = re.sub(r"등$", "", value)
    return value


def make_school_candidates(school_name: str) -> list[str]:
    compact = re.sub(r"\s+", "", clean_text(school_name))
    values = [compact]
    if compact.endswith("중"):
        values.append(f"{compact}학교")
    if compact.endswith("고"):
        values.extend([f"{compact}등학교", f"{compact}학교"])
    if compact.endswith("초"):
        values.extend([f"{compact}등학교", f"{compact}학교"])
    if compact and not compact.endswith("학교"):
        values.append(f"{compact}학교")

    # 입력이 '이수중학교'처럼 이미 완성형인 경우도 원문과 축약형을 모두 둔다.
    if compact.endswith("학교"):
        values.append(compact[:-2])

    deduped: list[str] = []
    for item in values:
        if item and item not in deduped:
            deduped.append(item)
    return deduped


def extract_region_hint(address: str) -> str:
    text = clean_text(address)
    match = re.search(r"서울(?:특별시)?\s*([가-힣]+구)", text)
    if match:
        return f"서울특별시 {match.group(1)}"
    return ""


def request_neis_school_info(candidate: str) -> list[dict[str, Any]]:
    params: dict[str, str] = {
        "Type": "json",
        "pIndex": "1",
        "pSize": "100",
        "ATPT_OFCDC_SC_CODE": SEOUL_OFFICE_CODE,
        "SCHUL_NM": candidate,
    }
    api_key = os.environ.get("NEIS_API_KEY") or os.environ.get("NEIS_KEY") or os.environ.get("NEIS_OPEN_API_KEY")
    if api_key:
        params["KEY"] = api_key

    url = f"{NEIS_SCHOOL_INFO_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 school-card-map/1.2",
            "Accept": "application/json,text/plain,*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=12) as response:  # noqa: S310 - fixed public API URL
        raw = response.read().decode("utf-8", errors="replace")

    data = json.loads(raw)
    school_info = data.get("schoolInfo")
    if not isinstance(school_info, list) or len(school_info) < 2:
        return []
    rows = school_info[1].get("row", [])
    return rows if isinstance(rows, list) else []


def pick_best_school(rows: list[dict[str, Any]], original_name: str) -> dict[str, Any] | None:
    if not rows:
        return None
    target = normalize_school_key(original_name)

    def score(row: dict[str, Any]) -> tuple[int, str]:
        name = clean_text(row.get("SCHUL_NM", ""))
        key = normalize_school_key(name)
        office = clean_text(row.get("ATPT_OFCDC_SC_NM", ""))
        address = " ".join(
            clean_text(row.get(field, ""))
            for field in ("ORG_RDNMA", "ORG_RDNDA", "ORG_ADRES", "LCTN_SC_NM")
        )
        value = 0
        if "서울" in office or "서울" in address:
            value += 100
        if key == target:
            value += 60
        elif target and (key.startswith(target) or target.startswith(key)):
            value += 35
        if extract_region_hint(address):
            value += 20
        # 중학교/고등학교 등 학교급이 이름과 맞으면 약간 우선
        kind = clean_text(row.get("SCHUL_KND_SC_NM", ""))
        if target.endswith("중") and "중학교" in kind:
            value += 5
        if target.endswith("고") and "고등학교" in kind:
            value += 5
        return (value, name)

    picked = sorted(rows, key=score, reverse=True)[0]
    return picked


def lookup_school(school_name: str) -> dict[str, Any]:
    candidates = make_school_candidates(school_name)
    tried: list[str] = []
    all_rows: list[dict[str, Any]] = []

    for candidate in candidates:
        tried.append(candidate)
        try:
            rows = request_neis_school_info(candidate)
        except Exception as exc:  # noqa: BLE001
            # Vercel 환경 변수 키 미설정/공공 API 일시 장애 등은 다음 후보나 프론트 카카오 보조조회로 넘긴다.
            return {
                "ok": False,
                "error": str(exc),
                "type": exc.__class__.__name__,
                "tried": tried,
                "source": "neis",
            }
        all_rows.extend(rows)
        picked = pick_best_school(rows, school_name)
        if picked:
            address = clean_text(" ".join(
                clean_text(picked.get(field, ""))
                for field in ("ORG_RDNMA", "ORG_RDNDA", "ORG_ADRES", "LCTN_SC_NM")
            ))
            region_hint = extract_region_hint(address)
            if region_hint:
                return {
                    "ok": True,
                    "schoolName": clean_text(picked.get("SCHUL_NM", school_name)),
                    "schoolKind": clean_text(picked.get("SCHUL_KND_SC_NM", "")),
                    "office": clean_text(picked.get("ATPT_OFCDC_SC_NM", "")),
                    "address": address,
                    "regionHint": region_hint,
                    "source": "neis",
                    "tried": tried,
                }

    picked = pick_best_school(all_rows, school_name)
    return {
        "ok": False,
        "error": "서울 학교 주소에서 자치구를 확인하지 못했습니다.",
        "schoolName": clean_text(picked.get("SCHUL_NM", school_name)) if picked else clean_text(school_name),
        "tried": tried,
        "source": "neis",
        "candidateCount": len(all_rows),
    }


class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:
        try:
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            school_name = clean_text(query.get("schoolName", [""])[0])
            if not school_name:
                self._write_json(400, {"ok": False, "error": "schoolName을 입력해 주세요."})
                return
            payload = lookup_school(school_name)
            self._write_json(200 if payload.get("ok") else 404, payload)
        except Exception as exc:  # noqa: BLE001
            self._write_json(502, {
                "ok": False,
                "error": str(exc),
                "type": exc.__class__.__name__,
                "source": "school_info",
            })

    def _write_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(data)
