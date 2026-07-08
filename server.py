from __future__ import annotations

import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from http.client import HTTPResponse
from http.cookiejar import CookieJar
from html.parser import HTMLParser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

PORT = 5500
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LIST_URL = "https://open.sen.go.kr/fus/MI000000000000000514/finance/list0010v.do"
DETAIL_URL = "https://open.sen.go.kr/fus/MI000000000000000514/finance/list0010d.do"

BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.6,en;q=0.5",
    "Origin": "https://open.sen.go.kr",
}


def normalize_month(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if len(digits) >= 6:
        return digits[:6]
    return digits


def clean_text(value: str) -> str:
    value = html.unescape(value or "")
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value).strip()
    return value


def normalize_date(value: str) -> str:
    text = clean_text(value)
    match = re.search(r"(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})", text)
    if not match:
        return text
    y, m, d = match.groups()
    return f"{y}-{int(m):02d}-{int(d):02d}"


def parse_amount(value: str) -> int:
    text = clean_text(value)
    digits = re.sub(r"[^0-9-]", "", text)
    if not digits or digits == "-":
        return 0
    try:
        return int(digits)
    except ValueError:
        return 0


class TableCellParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._in_tr = False
        self._in_cell = False
        self._current_row: list[str] = []
        self._current_cell: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        if tag == "tr":
            self._in_tr = True
            self._current_row = []
        elif tag in {"td", "th"} and self._in_tr:
            self._in_cell = True
            self._current_cell = []
        elif tag == "br" and self._in_cell:
            self._current_cell.append(" ")

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._current_cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag in {"td", "th"} and self._in_cell:
            self._current_row.append(clean_text("".join(self._current_cell)))
            self._current_cell = []
            self._in_cell = False
        elif tag == "tr" and self._in_tr:
            if any(cell for cell in self._current_row):
                self.rows.append(self._current_row)
            self._current_row = []
            self._in_tr = False


def parse_table_rows(html_text: str) -> list[list[str]]:
    parser = TableCellParser()
    parser.feed(html_text)
    return parser.rows


def looks_like_header(cells: list[str]) -> bool:
    joined = " ".join(cells)
    required = ["집행일자", "집행장소", "집행금액", "집행목적"]
    return sum(1 for item in required if item in joined) >= 3


def make_header_map(cells: list[str]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for index, cell in enumerate(cells):
        normalized = cell.replace(" ", "").replace("(원)", "")
        if "번호" in normalized:
            mapping["number"] = index
        elif "집행일자" in normalized:
            mapping["date"] = index
        elif "집행장소" in normalized:
            mapping["place"] = index
        elif "집행금액" in normalized:
            mapping["amount"] = index
        elif "집행목적" in normalized:
            mapping["purpose"] = index
        elif "집행대상" in normalized or "참석자" in normalized:
            mapping["target"] = index
        elif "집행시간" in normalized:
            mapping["time"] = index
        elif "승인자" in normalized:
            mapping["approver"] = index
    return mapping


def get_cell(cells: list[str], mapping: dict[str, int], key: str, fallback_index: int) -> str:
    index = mapping.get(key, fallback_index)
    if 0 <= index < len(cells):
        return clean_text(cells[index])
    return ""


def row_from_cells(cells: list[str], mapping: dict[str, int] | None) -> dict[str, Any] | None:
    if len(cells) < 5:
        return None
    mapping = mapping or {}
    row = {
        "number": get_cell(cells, mapping, "number", 0),
        "date": normalize_date(get_cell(cells, mapping, "date", 1)),
        "place": get_cell(cells, mapping, "place", 2),
        "amount": parse_amount(get_cell(cells, mapping, "amount", 3)),
        "purpose": get_cell(cells, mapping, "purpose", 4),
        "target": get_cell(cells, mapping, "target", 5),
        "time": get_cell(cells, mapping, "time", 6),
        "approver": get_cell(cells, mapping, "approver", 7),
    }
    if not re.match(r"^20\d{2}-\d{2}-\d{2}$", row["date"]):
        return None
    if not row["place"] or not row["purpose"]:
        return None
    return row


def extract_detail_rows(html_text: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    header_map: dict[str, int] | None = None
    for cells in parse_table_rows(html_text):
        if looks_like_header(cells):
            header_map = make_header_map(cells)
            continue
        row = row_from_cells(cells, header_map)
        if row:
            rows.append(row)
    return dedupe_rows(rows)


def dedupe_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for row in rows:
        key = "|".join(str(row.get(item, "")) for item in ["date", "place", "amount", "purpose"])
        if key in seen:
            continue
        seen.add(key)
        item = dict(row)
        item["id"] = len(result) + 1
        result.append(item)
    return result


def extract_detail_candidates(html_text: str, wanted_school: str, wanted_month: str) -> list[dict[str, str]]:
    pattern = re.compile(
        r"fncDetailList\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\)",
        re.IGNORECASE,
    )
    candidates: list[dict[str, str]] = []
    for school_code, neis_cd, school_name, stdr_month in pattern.findall(html_text):
        school_name = clean_text(school_name)
        month = normalize_month(stdr_month)
        if wanted_month and month != wanted_month:
            continue
        if wanted_school and wanted_school not in school_name:
            continue
        candidates.append(
            {
                "school_code": clean_text(school_code),
                "neis_cd": clean_text(neis_cd),
                "school_name": school_name,
                "stdr_month": month,
            }
        )
    return candidates


def extract_page_count(html_text: str, total_rows: int) -> int:
    text = clean_text(re.sub(r"<[^>]+>", " ", html_text))
    match = re.search(r"전체\s*([0-9,]+)\s*건\s*\d+\s*/\s*(\d+)", text)
    if match:
        return max(1, int(match.group(2)))
    match = re.search(r"\b\d+\s*/\s*(\d+)\b", text)
    if match:
        return max(1, int(match.group(1)))
    if total_rows > 10:
        return (total_rows + 9) // 10
    return 1


def decode_response(response: HTTPResponse, data: bytes) -> str:
    content_type = response.headers.get("Content-Type", "")
    charset_match = re.search(r"charset=([\w-]+)", content_type, re.IGNORECASE)
    candidates = []
    if charset_match:
        candidates.append(charset_match.group(1))
    candidates.extend(["utf-8", "cp949", "euc-kr"])
    for encoding in candidates:
        try:
            return data.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return data.decode("utf-8", errors="replace")


def post_form(opener: urllib.request.OpenerDirector, url: str, form: dict[str, str], referer: str | None = None) -> str:
    encoded = urllib.parse.urlencode(form).encode("utf-8")
    headers = dict(BROWSER_HEADERS)
    headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8"
    headers["Referer"] = referer or LIST_URL
    request = urllib.request.Request(url, data=encoded, headers=headers, method="POST")
    with opener.open(request, timeout=25) as response:
        data = response.read()
        return decode_response(response, data)


def make_list_payload(school_name: str, page_index: int) -> dict[str, str]:
    return {
        "pageIndex": str(page_index),
        "school_code": "",
        "neis_cd": "",
        "school_name": "",
        "stdr_month": "",
        "searchOraCode": "",
        "searchSchoolCode": "",
        "searchStaDate": "",
        "searchEndDate": "",
        "searchCondition": "school_name",
        "searchKeyword": school_name,
        "x": "20",
        "y": "20",
    }


def make_detail_payload(candidate: dict[str, str], school_name: str, det_page_index: int) -> dict[str, str]:
    payload = {
        "pageIndex": "1",
        "school_code": candidate["school_code"],
        "neis_cd": candidate["neis_cd"],
        "school_name": candidate["school_name"],
        "stdr_month": candidate["stdr_month"],
        "searchOraCode": "",
        "searchSchoolCode": "",
        "searchStaDate": "",
        "searchEndDate": "",
        "searchCondition": "school_name",
        "searchKeyword": school_name,
        "seq": "",
        "searchDetStaDate": "",
        "searchDetEndDate": "",
        "searchDetCondition": "all",
        "searchDetKeyword": "",
    }
    if det_page_index > 1:
        payload["detPageIndex"] = str(det_page_index)
    else:
        payload["detPageIndex"] = "1"
    return payload


def collect_sen_budget_rows(school_name: str, base_month: str) -> dict[str, Any]:
    school_name = clean_text(school_name)
    wanted_month = normalize_month(base_month)
    if not school_name:
        raise ValueError("학교명을 입력해 주세요.")
    if not re.match(r"^20\d{4}$", wanted_month):
        raise ValueError("기준월을 YYYY-MM 또는 YYYYMM 형식으로 입력해 주세요.")

    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
    detail_candidate: dict[str, str] | None = None
    tried_list_pages: list[int] = []

    # 학교명 검색 결과에서 원하는 기준월의 fncDetailList(...)를 찾는다.
    for page_index in range(1, 16):
        tried_list_pages.append(page_index)
        list_html = post_form(opener, LIST_URL, make_list_payload(school_name, page_index), referer=LIST_URL)
        candidates = extract_detail_candidates(list_html, school_name, wanted_month)
        if candidates:
            detail_candidate = candidates[0]
            break
        # 검색 결과가 사실상 없으면 더 돌지 않는다.
        if "fncDetailList" not in list_html and page_index >= 3:
            break

    if not detail_candidate:
        raise LookupError(f"{school_name} / {wanted_month} 목록에서 상세보기 정보를 찾지 못했습니다.")

    all_rows: list[dict[str, Any]] = []
    page_count = 1
    page_debug: list[dict[str, Any]] = []

    first_html = post_form(opener, DETAIL_URL, make_detail_payload(detail_candidate, school_name, 1), referer=LIST_URL)
    first_rows = extract_detail_rows(first_html)
    page_count = extract_page_count(first_html, len(first_rows))
    page_debug.append({"detPageIndex": 1, "rows": len(first_rows)})
    all_rows.extend(first_rows)

    # 상세 페이지는 pageIndex가 아니라 detPageIndex로 넘겨야 한다.
    for det_page in range(2, min(page_count, 30) + 1):
        detail_html = post_form(opener, DETAIL_URL, make_detail_payload(detail_candidate, school_name, det_page), referer=DETAIL_URL)
        page_rows = extract_detail_rows(detail_html)
        page_debug.append({"detPageIndex": det_page, "rows": len(page_rows)})
        all_rows.extend(page_rows)

    rows = dedupe_rows(all_rows)
    rows = [row for row in rows if str(row.get("date", "")).replace("-", "")[:6] == wanted_month]
    for index, row in enumerate(rows, start=1):
        row["id"] = index

    return {
        "schoolName": detail_candidate["school_name"],
        "baseMonth": wanted_month,
        "detail": detail_candidate,
        "rows": rows,
        "debug": {
            "listPagesTried": tried_list_pages,
            "detailPages": page_debug,
            "pageCount": page_count,
            "rowCount": len(rows),
        },
    }


class CardMapHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        path = urllib.parse.urlparse(path).path
        path = os.path.normpath(urllib.parse.unquote(path)).lstrip(os.sep)
        return os.path.join(BASE_DIR, path)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/school_info":
            self.handle_school_info(parsed)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/sen-fetch":
            self.handle_sen_fetch()
            return
        self.send_error(404, "Not Found")

    def write_json(self, status: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def handle_sen_fetch(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
            raw = self.rfile.read(length).decode("utf-8") if length else "{}"
            body = json.loads(raw or "{}")
            result = collect_sen_budget_rows(str(body.get("schoolName", "")), str(body.get("baseMonth", "")))
            self.write_json(200, {"ok": True, **result})
        except Exception as exc:  # noqa: BLE001
            self.write_json(502, {"ok": False, "error": str(exc), "type": exc.__class__.__name__})

    def handle_school_info(self, parsed: urllib.parse.ParseResult) -> None:
        try:
            from api.school_info import lookup_school, clean_text as clean_school_text

            query = urllib.parse.parse_qs(parsed.query)
            school_name = clean_school_text(query.get("schoolName", [""])[0])
            if not school_name:
                self.write_json(400, {"ok": False, "error": "schoolName을 입력해 주세요."})
                return
            payload = lookup_school(school_name)
            self.write_json(200 if payload.get("ok") else 404, payload)
        except Exception as exc:  # noqa: BLE001
            self.write_json(502, {"ok": False, "error": str(exc), "type": exc.__class__.__name__})



if __name__ == "__main__":
    os.chdir(BASE_DIR)
    server = ThreadingHTTPServer(("127.0.0.1", PORT), CardMapHandler)
    print(f"학교카드 사용처 지도 v1.2.0 서울교육청 자동 불러오기 서버 실행 중: http://localhost:{PORT}")
    print("종료하려면 Ctrl+C")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n서버를 종료합니다.")
        server.server_close()
