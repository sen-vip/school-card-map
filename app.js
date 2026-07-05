const PURPOSE_EXCLUDE_KEYWORDS = [
  "경조사비", "경조비", "부의금", "축의금", "조의금", "근조", "화환", "직책급업무추진비"
];

const PLACE_EXCLUDE_KEYWORDS = [
  "지마켓", "G마켓", "g마켓", "주식회사 지마켓", "11번가", "십일번가", "옥션", "쿠팡",
  "네이버쇼핑", "네이버페이", "SSG", "ssg", "에스에스지", "에스에스지닷컴", "쓱", "인터파크", "온라인", "인터넷", "택배"
];

const SEN_DEFAULT_URL = "https://open.sen.go.kr/fus/MI000000000000000514/finance/list0010v.do";
const SEN_DETAIL_URL = "https://open.sen.go.kr/fus/MI000000000000000514/finance/list0010d.do";
const AUTO_FETCH_ENDPOINT = "/sen-fetch";
// 브라우저에서 사용하는 카카오 JavaScript 키입니다.
// REST API 키/Admin 키가 아니며, 카카오 개발자센터의 JavaScript SDK 도메인 제한으로 보호합니다.
const DEFAULT_KAKAO_JS_KEY = "9a75b8f0e12044be3f4588a0f3c728b5";
const DEFAULT_REGION_HINT = "서울특별시";

const SAMPLE_TEXT = `번호	집행일자	집행장소	집행금액	집행목적	집행대상	집행시간	승인자
13	2026-02-04	주식회사부산어묵직판	105,000	[카드]2025학년도 공연한마당 평가회비 지출	창의체험부교사 외	2026-02-04 16:00	관리자
12	2026-02-04	대치사월에보리밥	266,000	2025학년도 학교운영위원회 협의회비 지출	교장, 교감, 행정실장, 위원장, 부위원장, 학부모위원 2인, 지역위원 1인, 행정실 직원 2인	2026-02-04 16:00	관리자
11	2026-02-05	채선당(성수동1가점)	363,000	2025학년도 부장교사 워크숍 비용 지출	교장, 교감, 행정실장, 부장교사 12명	2026-02-09 00:00	관리자
10	2026-02-09	대치사월에보리밥	424,500	2025학년도 졸업식 평가협의비 지출	교장, 교감, 교무기획부장, 학년부장 등	2026-02-09 13:00	관리자
9	2026-02-09	갱스터피자	231,300	시설관리업무 협의회비 지출	행정실장, 행정실 직원, 교무실 직원 등	2026-02-09 11:00	관리자
8	2026-02-10	오토김밥 대치	300,000	2026학년도 계약제(기간제)교원 면접 및 계약 업무추진 협의회비 지출	교장, 교감, 행정실장, 교무부장 등	2026-02-10 11:00	관리자
7	2026-02-20	명동관	504,000	2026학년도 신학년 대비 업무 협의회비 지출	교장, 교감, 행정실장, 부장교사 등	2026-02-20 12:00	관리자
6	2026-02-23	주식회사 지마켓	872,020	[카드]행정실 및 관리실 방문객 접대용 다과류 구입	-	-	관리자
5	2026-02-23	된밥장사장	92,500	2026학년도 신학년 집중 준비기간 협의회비 지출(2월 23일)	전체 교원 75명	2026-02-23 12:00	관리자
4	2026-02-24	지미존스 역삼역점	832,240	2026학년도 신학년 집중 준비기간 협의회비 지출(2월 24일)	전체 교원 75명	2026-02-24 12:00	관리자
3	2026-02-26	미니멜레 베이커리&커피바 개포점	287,720	신학년 대비 교육행정협의회비 지출	행정실장 외 18명	2026-02-26 12:30	관리자
2	2026-02-27	주식회사 지마켓	435,000	[카드]2026학년도 급식 운영 관련 업무 협의회비 지출	교장 외 14명	2026-02-26 00:00	관리자
1	2026-02-27	오토김밥 도곡점	1,174,000	2026학년도 신학년 집중 준비기간 협의회비 지출(2월 27일)	-	-	관리자`;

const state = {
  rawRows: [],
  visibleRows: [],
  excludedRows: [],
  pendingRows: [],
  groupedPlaces: [],
  mode: "empty",
  currentTab: "target",
  map: null,
  bounds: null,
  markers: [],
  infowindows: [],
  kakaoLoaded: false,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  schoolName: $("#schoolName"),
  areaHint: $("#areaHint"),
  baseMonth: $("#baseMonth"),
  kakaoKey: $("#kakaoKey"),
  rawInput: $("#rawInput"),
  makeMapBtn: $("#makeMapBtn"),
  parseOnlyBtn: $("#parseOnlyBtn"),
  sampleBtn: $("#sampleBtn"),
  clearBtn: $("#clearBtn"),
  statusText: $("#statusText"),
  tableWrap: $("#tableWrap"),
  fitMapBtn: $("#fitMapBtn"),
  map: $("#map"),
  mapNotice: $("#mapNotice"),
  tableHint: $("#tableHint"),
  resultTabs: $("#resultTabs"),
  senSourceUrl: $("#senSourceUrl"),
  senProxyUrl: $("#senProxyUrl"),
  fetchSenBtn: $("#fetchSenBtn"),
  openSenBtn: $("#openSenBtn"),
  autoStatusText: $("#autoStatusText"),
  autoDebugBox: $("#autoDebugBox"),
  autoDebugText: $("#autoDebugText"),
  keyStatus: $("#keyStatus"),
  regionStatus: $("#regionStatus"),
  nextActionPanel: $("#nextActionPanel"),
  nextActionBadge: $("#nextActionBadge"),
  nextActionTitle: $("#nextActionTitle"),
  nextActionDesc: $("#nextActionDesc"),
  ctaMapBtn: $("#ctaMapBtn"),
};

init();

function init() {
  // 기본 카카오 JavaScript 키가 내장되어 있으므로 일반 사용자는 키를 입력하지 않아도 됩니다.
  // 사용자가 직접 저장한 키가 있으면 고급 설정에서 override 용도로만 표시합니다.
  elements.kakaoKey.value = localStorage.getItem("schoolCardMapKakaoKey") || "";
  elements.schoolName.value = localStorage.getItem("schoolCardMapSchoolName") || "";
  elements.areaHint.value = localStorage.getItem("schoolCardMapAreaHint") || "";
  elements.baseMonth.value = localStorage.getItem("schoolCardMapBaseMonth") || getCurrentMonth();
  if (elements.senSourceUrl) elements.senSourceUrl.value = localStorage.getItem("schoolCardMapSenSourceUrl") || SEN_DEFAULT_URL;
  // v1.1.4: 이전 버전에서 저장된 /sen-proxy?url= 값이 자동 불러오기를 막지 않도록 강제로 /sen-fetch를 사용합니다.
  localStorage.removeItem("schoolCardMapSenProxyUrl");
  if (elements.senProxyUrl) elements.senProxyUrl.value = AUTO_FETCH_ENDPOINT;
  updateMapSettingStatus();

  $("#purposeRules").textContent = PURPOSE_EXCLUDE_KEYWORDS.join(", ");
  $("#placeRules").textContent = PLACE_EXCLUDE_KEYWORDS.join(", ");

  elements.makeMapBtn.addEventListener("click", () => run({ withMap: true }));
  elements.ctaMapBtn?.addEventListener("click", () => run({ withMap: true }));
  elements.parseOnlyBtn.addEventListener("click", () => run({ withMap: false }));
  elements.fetchSenBtn?.addEventListener("click", fetchSenBudgetData);
  elements.openSenBtn?.addEventListener("click", () => window.open(elements.senSourceUrl?.value || SEN_DEFAULT_URL, "_blank", "noopener"));
  elements.sampleBtn.addEventListener("click", insertSample);
  elements.clearBtn.addEventListener("click", clearAll);
  elements.fitMapBtn.addEventListener("click", fitMapToMarkers);
  elements.tableWrap.addEventListener("click", handleTableClick);
  document.addEventListener("click", handleInfoWindowClose);

  [elements.kakaoKey, elements.schoolName, elements.areaHint, elements.baseMonth, elements.senSourceUrl, elements.senProxyUrl].filter(Boolean).forEach((input) => {
    input.addEventListener("change", saveSettings);
  });
  elements.kakaoKey?.addEventListener("input", updateKeyStatus);
  elements.schoolName?.addEventListener("input", updateMapSettingStatus);
  elements.areaHint?.addEventListener("input", updateMapSettingStatus);

  elements.resultTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".tab");
    if (!button) return;
    state.currentTab = button.dataset.tab;
    $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderTable();
  });

  renderTabs();
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function saveSettings() {
  const userKakaoKey = elements.kakaoKey.value.trim();
  if (userKakaoKey) localStorage.setItem("schoolCardMapKakaoKey", userKakaoKey);
  else localStorage.removeItem("schoolCardMapKakaoKey");
  localStorage.setItem("schoolCardMapSchoolName", elements.schoolName.value.trim());
  localStorage.setItem("schoolCardMapAreaHint", elements.areaHint.value.trim());
  localStorage.setItem("schoolCardMapBaseMonth", elements.baseMonth.value.trim());
  if (elements.senSourceUrl) localStorage.setItem("schoolCardMapSenSourceUrl", elements.senSourceUrl.value.trim());
  // 자동수집 API는 /sen-fetch로 고정합니다. 사용자가 수정하거나 이전 값이 저장되지 않게 합니다.
  updateMapSettingStatus();
}

function getEffectiveKakaoKey() {
  return elements.kakaoKey?.value?.trim() || DEFAULT_KAKAO_JS_KEY;
}

function updateMapSettingStatus() {
  updateKeyStatus();
  updateRegionStatus();
}

function updateKeyStatus() {
  if (!elements.keyStatus) return;
  const hasKey = Boolean(getEffectiveKakaoKey());
  const usingUserKey = Boolean(elements.kakaoKey?.value?.trim());
  elements.keyStatus.textContent = hasKey
    ? usingUserKey ? "지도 API 사용자 키 적용" : "지도 API 설정 완료"
    : "지도 API 키 미설정";
  elements.keyStatus.classList.toggle("ready", hasKey);
}

function updateRegionStatus() {
  if (!elements.regionStatus) return;
  const region = getEffectiveAreaHint();
  elements.regionStatus.textContent = `검색 지역: ${region}`;
  elements.regionStatus.classList.toggle("ready", Boolean(region));
}

function updateNextAction(mode = state.mode) {
  if (!elements.nextActionPanel) return;
  const hasRows = state.rawRows.length > 0;
  elements.nextActionPanel.classList.toggle("hidden", !hasRows);
  if (!hasRows) return;

  const schoolName = elements.schoolName.value.trim() || "선택한 학교";
  const baseMonth = formatDisplayMonth(elements.baseMonth.value.trim());
  const targetAmount = state.visibleRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const excludedAmount = state.excludedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const mappedRows = getMappedRows();
  const mappedAmount = mappedRows.reduce((sum, row) => sum + (row.amount || 0), 0);

  if (mode === "mapped") {
    elements.nextActionBadge.textContent = "지도 생성 완료";
    elements.nextActionTitle.textContent = `${schoolName} ${baseMonth} 사용처 지도를 만들었습니다.`;
    elements.nextActionDesc.textContent = `표시 완료 ${mappedRows.length}건 · ${formatWon(mappedAmount)}, 위치 확인 필요 ${state.pendingRows.length}건입니다. 자료가 바뀌면 지도를 다시 만들 수 있습니다.`;
    elements.ctaMapBtn.innerHTML = `<small>다시</small> 지도 다시 만들기`;
    elements.nextActionPanel.classList.add("complete");
  } else {
    elements.nextActionBadge.textContent = "다음 단계";
    elements.nextActionTitle.textContent = `${schoolName} ${baseMonth} 자료 확인이 완료되었습니다.`;
    elements.nextActionDesc.textContent = `전체 ${state.rawRows.length}건 중 지도 대상 ${state.visibleRows.length}건 · ${formatWon(targetAmount)}, 지도 제외 ${state.excludedRows.length}건 · ${formatWon(excludedAmount)}입니다. 이제 사용처 위치를 지도에 표시하세요.`;
    elements.ctaMapBtn.innerHTML = `<small>2단계</small> 지도 만들기`;
    elements.nextActionPanel.classList.remove("complete");
  }
}

function hideNextAction() {
  elements.nextActionPanel?.classList.add("hidden");
}

function formatDisplayMonth(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 6) return `${digits.slice(0, 4)}년 ${Number(digits.slice(4, 6))}월`;
  if (/^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-");
    return `${year}년 ${Number(month)}월`;
  }
  return value || "선택월";
}

function insertSample() {
  elements.schoolName.value = elements.schoolName.value || "대청중학교";
  // 지역 보조어는 학교명으로 자동 추정됩니다. 사용자가 직접 입력한 값은 그대로 둡니다.
  elements.baseMonth.value = "2026-02";
  elements.rawInput.value = SAMPLE_TEXT;
  saveSettings();
  setStatus("예시 자료를 넣었습니다. 먼저 자료 확인하기를 누르거나 바로 지도 만들기를 눌러보세요.");
}

function clearAll() {
  if (!confirm("입력한 표와 결과를 모두 지울까요?")) return;
  elements.rawInput.value = "";
  state.rawRows = [];
  state.visibleRows = [];
  state.excludedRows = [];
  state.pendingRows = [];
  state.groupedPlaces = [];
  state.mode = "empty";
  state.currentTab = "target";
  clearMarkers();
  setMapNotice(false);
  renderTabs();
  renderSummary();
  renderTable();
  hideNextAction();
  setStatus("초기화했습니다.");
}

async function run({ withMap }) {
  saveSettings();
  setStatus("표를 정리하는 중입니다...");
  const parsedRows = parsePastedTable(elements.rawInput.value);
  if (parsedRows.length === 0) {
    setStatus("인식할 수 있는 표가 없습니다. 탭으로 구분된 표를 붙여넣어 주세요.", true);
    return;
  }

  const classified = classifyRows(parsedRows);
  state.rawRows = classified.rawRows;
  state.visibleRows = classified.visibleRows;
  state.excludedRows = classified.excludedRows;
  state.pendingRows = [];
  state.groupedPlaces = groupByPlace(state.visibleRows);
  clearMarkers();

  if (!withMap) {
    state.mode = "parsed";
    state.currentTab = "target";
    renderTabs();
    renderSummary();
    renderTable();
    setMapNotice(true);
    updateNextAction("parsed");
    setStatus("자료 확인이 완료되었습니다. 지도 만들기를 누르면 사용처 위치를 검색합니다.");
    return;
  }

  const key = getEffectiveKakaoKey();
  if (!key) {
    state.mode = "parsed";
    state.currentTab = "target";
    renderTabs();
    renderSummary();
    renderTable();
    setMapNotice(true);
    updateNextAction("parsed");
    setStatus("지도 키 문제로 지도를 표시하지 못했습니다. 고급 설정에서 카카오 JavaScript 키를 확인해 주세요.", true);
    return;
  }

  try {
    state.mode = "mapped";
    state.currentTab = "mapped";
    renderTabs();
    renderSummary();
    renderTable();
    setMapNotice(false);
    setStatus("카카오맵을 불러오는 중입니다...");
    await loadKakaoMap(key);
    initMapIfNeeded();
    await searchPlacesAndRenderMarkers();
    renderSummary();
    renderTable();
    updateNextAction("mapped");
    const mappedGroups = getMappedGroups();
    const message = state.pendingRows.length
      ? `지도 생성이 완료되었습니다. 표시 완료 ${mappedGroups.length}곳, 위치 확인 필요 ${state.pendingRows.length}건입니다.`
      : `지도 생성이 완료되었습니다. 표시 완료 ${mappedGroups.length}곳입니다.`;
    setStatus(message);
  } catch (error) {
    console.error(error);
    setStatus(error.message || "지도 표시 중 오류가 발생했습니다.", true);
  }
}


function setAutoStatus(message, isError = false) {
  if (!elements.autoStatusText) return;
  elements.autoStatusText.textContent = message;
  elements.autoStatusText.style.color = isError ? "#c2410c" : "#687386";
}

function formatAutoFetchError(error) {
  const base = error?.message || "자동 불러오기 중 오류가 발생했습니다.";
  const type = error?.remoteType || error?.name || "";

  if (type === "LookupError" || base.includes("상세보기 정보를 찾지 못했습니다")) {
    if (/20\d{4}/.test(base)) {
      return `${base} 해당 기준월의 업무추진비 공개자료가 없거나 학교명이 다를 수 있습니다. 다른 기준월 또는 정확한 학교명을 확인해 주세요. 자동 불러오기가 실패해도 아래 수동 붙여넣기로 계속 사용할 수 있습니다.`;
    }
    return `${base} 해당 학교명을 찾지 못했습니다. 학교명을 정확히 입력했는지 확인해 주세요. 자동 불러오기가 실패해도 아래 수동 붙여넣기로 계속 사용할 수 있습니다.`;
  }

  if (type === "ValueError") {
    return `${base} 학교명과 기준월을 확인해 주세요.`;
  }

  if (base.includes("상세표") || base.includes("읽지 못")) {
    return `${base} 자료는 가져왔지만 상세표를 읽지 못했습니다. 공개페이지 구조가 변경되었을 수 있습니다. 아래 수동 붙여넣기로 계속 사용할 수 있습니다.`;
  }

  return `${base} 자동 불러오기는 Vercel 배포 주소 또는 로컬 server.py 실행 주소에서 동작합니다. 현재 주소와 인터넷 연결을 확인해 주세요. 실패해도 아래 수동 붙여넣기로 계속 사용할 수 있습니다.`;
}

function renderAutoDebug(info = {}) {
  if (!elements.autoDebugText) return;
  const month = formatCollectedMonth(info.baseMonth || "");
  const debug = info.debug || {};
  const detail = info.detail || {};
  const pages = Array.isArray(debug.detailPages)
    ? debug.detailPages.map((page) => `${page.detPageIndex}페이지: ${page.rows}건`).join("\n")
    : "-";
  elements.autoDebugText.textContent = [
    "요청 방식: POST",
    `목록 URL: ${SEN_DEFAULT_URL}`,
    `상세 URL: ${SEN_DETAIL_URL}`,
    `기준월 변환값: ${month} → ${String(info.baseMonth || "").replace(/\D/g, "") || "-"}`,
    `school_code: ${detail.school_code || "-"}`,
    `neis_cd: ${detail.neis_cd || "-"}`,
    `stdr_month: ${detail.stdr_month || "-"}`,
    `목록 페이지 시도: ${(debug.listPagesTried || []).join(", ") || "-"}`,
    `상세 페이지 수: ${debug.pageCount || "-"}`,
    "상세 페이지 수집:",
    pages,
    `수집된 원본 행 수: ${info.rowCount ?? debug.rowCount ?? "-"}`,
  ].join("\n");
}

async function fetchSenBudgetData() {
  saveSettings();
  const schoolName = elements.schoolName.value.trim();
  const baseMonth = elements.baseMonth.value.trim();

  if (!schoolName) {
    setAutoStatus("학교명을 입력해 주세요.", true);
    return;
  }
  if (!baseMonth) {
    setAutoStatus("기준월을 선택해 주세요.", true);
    return;
  }

  try {
    setAutoStatus(`${schoolName} / ${baseMonth} 기준으로 서울교육청 공개자료를 가져오는 중입니다...`);
    const rows = await collectSenRows({ schoolName, baseMonth });
    if (!rows.length) {
      setAutoStatus("해당 학교명과 기준월의 업무추진비 공개자료를 찾지 못했습니다. 학교명 또는 기준월을 확인해 주세요. 자동 불러오기가 실패해도 아래 수동 붙여넣기로 계속 사용할 수 있습니다.", true);
      return;
    }

    elements.rawInput.value = rowsToTsv(rows);
    setAutoStatus(`${rows.length}건을 가져왔습니다. 아래 붙여넣기 칸에 자동 입력했고 자료 확인을 실행했습니다.`);
    await run({ withMap: false });
    setStatus("자료를 가져왔습니다. 화면 중앙의 [지도 만들기]를 눌러 사용처를 지도에 표시하세요.");
  } catch (error) {
    console.error(error);
    setAutoStatus(formatAutoFetchError(error), true);
  }
}

async function collectSenRows({ schoolName, baseMonth }) {
  const endpoint = AUTO_FETCH_ENDPOINT;
  if (elements.senProxyUrl) elements.senProxyUrl.value = AUTO_FETCH_ENDPOINT;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schoolName, baseMonth }),
  });
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(`자동수집 응답을 읽지 못했습니다. ${response.status}`);
  }
  if (!response.ok || !data?.ok) {
    const message = data?.error || `자동 불러오기 요청 실패 ${response.status}`;
    const error = new Error(message);
    error.remoteType = data?.type || "NetworkError";
    error.status = response.status;
    throw error;
  }
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const debug = data.debug || {};
  const detail = data.detail || {};
  renderAutoDebug({ schoolName: data.schoolName || schoolName, baseMonth: data.baseMonth || baseMonth, debug, detail, rowCount: rows.length });
  const pageInfo = Array.isArray(debug.detailPages)
    ? debug.detailPages.map((page) => `${page.detPageIndex}p ${page.rows}건`).join(", ")
    : "";
  setAutoStatus(
    `${data.schoolName || schoolName} ${formatCollectedMonth(data.baseMonth || baseMonth)} 자동수집 완료: ${rows.length}건` +
    (pageInfo ? ` · 상세 ${pageInfo}` : "") +
    (detail.school_code ? ` · school_code ${detail.school_code}` : "")
  );
  return rows.map((row, index) => ({
    id: index + 1,
    date: row.date || "",
    place: row.place || "",
    amount: Number(row.amount || 0),
    purpose: row.purpose || "",
    target: row.target || "",
    time: row.time || "",
    approver: row.approver || "",
  }));
}

function formatCollectedMonth(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length >= 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
  return value || "";
}

function normalizeSenUrl(url) {
  const value = cleanCell(url) || SEN_DEFAULT_URL;
  try {
    return new URL(value, SEN_DEFAULT_URL).toString();
  } catch {
    return SEN_DEFAULT_URL;
  }
}

function makeSenListCandidateUrls(sourceUrl, schoolName, baseMonth) {
  const ym = (baseMonth || "").replace("-", "");
  const url = new URL(sourceUrl, SEN_DEFAULT_URL);
  const base = `${url.origin}${url.pathname}`;
  const encodedSchool = schoolName || "";
  const candidates = [];
  const paramSets = [
    // 서울교육청 화면은 '검색영역: 전체/기준월/관할기관/기관명' 구조라서
    // 학교명과 기준월을 동시에 넣는 후보를 여러 벌 시도한다.
    { searchKeyword: encodedSchool, searchCondition: "all", searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchCondition: "기관명", searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchCondition: "insttNm", searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, srchKeyword: encodedSchool, searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchWrd: encodedSchool, searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchText: encodedSchool, searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchCnd: "schulNm", searchYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchCondition: "school", yyymm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, yyyyMm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, basYm: ym, pageIndex: "1" },
    { searchKeyword: encodedSchool, searchMonth: ym, pageIndex: "1" },
    { searchKeyword: `${ym} ${encodedSchool}`, searchCondition: "all", pageIndex: "1" },
    { searchKeyword: encodedSchool, pageIndex: "1" },
  ];

  // 원본 무파라미터 URL은 전체 목록이라 마지막 후보로만 둔다.
  for (const params of paramSets) {
    const item = new URL(base);
    for (const [key, value] of Object.entries(params)) {
      if (value) item.searchParams.set(key, value);
    }
    candidates.push(item.toString());
  }
  candidates.push(sourceUrl);
  return unique(candidates);
}

function rowsToTsv(rows) {
  const header = ["번호", "집행일자", "집행장소", "집행금액", "집행목적", "집행대상", "집행시간", "승인자"];
  const body = rows.map((row, index) => [
    rows.length - index,
    row.date,
    row.place,
    formatPlainAmount(row.amount),
    row.purpose,
    row.target || "",
    row.time || "",
    row.approver || "",
  ].map((cell) => String(cell ?? "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t"));
  return [header.join("\t"), ...body].join("\n");
}

function formatPlainAmount(value) {
  return Number(value || 0).toLocaleString("ko-KR");
}

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function parsePastedTable(text) {
  const cleaned = (text || "").replace(/\r/g, "").trim();
  if (!cleaned) return [];

  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  const rows = [];
  let headerMap = null;

  for (const line of lines) {
    const cells = splitLine(line);
    if (cells.length < 4) continue;

    if (looksLikeHeader(cells)) {
      headerMap = makeHeaderMap(cells);
      continue;
    }

    const row = makeRowFromCells(cells, headerMap);
    if (row && (row.date || row.place || row.amount || row.purpose)) rows.push(row);
  }

  return rows.map((row, index) => ({ ...row, id: index + 1 }));
}

function splitLine(line) {
  if (line.includes("\t")) return line.split("\t").map(cleanCell);
  if (line.includes(",") && !line.includes("집행목적")) return splitCsvLine(line).map(cleanCell);
  return line.split(/\s{2,}/).map(cleanCell);
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === "," && !inQuote) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function cleanCell(value) {
  return String(value || "").replace(/\u00a0/g, " ").trim();
}

function looksLikeHeader(cells) {
  const joined = cells.join(" ");
  return joined.includes("집행일자") && joined.includes("집행장소") && joined.includes("집행금액");
}

function makeHeaderMap(cells) {
  const map = {};
  cells.forEach((cell, index) => {
    const key = cell.replace(/\s/g, "");
    if (key.includes("집행일자")) map.date = index;
    if (key.includes("집행장소")) map.place = index;
    if (key.includes("집행금액")) map.amount = index;
    if (key.includes("집행목적")) map.purpose = index;
    if (key.includes("집행대상")) map.target = index;
    if (key.includes("집행시간")) map.time = index;
    if (key.includes("승인자")) map.approver = index;
  });
  return map;
}

function makeRowFromCells(cells, headerMap) {
  if (headerMap && Object.keys(headerMap).length) {
    return {
      date: normalizeDate(cells[headerMap.date]),
      place: cleanPlace(cells[headerMap.place]),
      amount: parseAmount(cells[headerMap.amount]),
      purpose: cleanCell(cells[headerMap.purpose]),
      target: cleanCell(cells[headerMap.target]),
      time: cleanCell(cells[headerMap.time]),
      approver: cleanCell(cells[headerMap.approver]),
    };
  }

  const offset = isSequenceNumber(cells[0]) ? 1 : 0;
  return {
    date: normalizeDate(cells[offset]),
    place: cleanPlace(cells[offset + 1]),
    amount: parseAmount(cells[offset + 2]),
    purpose: cleanCell(cells[offset + 3]),
    target: cleanCell(cells[offset + 4]),
    time: cleanCell(cells[offset + 5]),
    approver: cleanCell(cells[offset + 6]),
  };
}

function isSequenceNumber(value) {
  return /^\d+$/.test(cleanCell(value));
}

function normalizeDate(value) {
  const text = cleanCell(value);
  const match = text.match(/(\d{4})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/);
  if (!match) return text;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function cleanPlace(value) {
  return cleanCell(value).replace(/^\[?카드\]?\s*/i, "").replace(/^[-–—]+$/, "");
}

function parseAmount(value) {
  const number = cleanCell(value).replace(/[^0-9-]/g, "");
  return number ? Number(number) : 0;
}

function classifyRows(rows) {
  const rawRows = [];
  const visibleRows = [];
  const excludedRows = [];

  for (const row of rows) {
    const reason = getExcludeReason(row);
    const normalized = {
      ...row,
      mapVisible: !reason,
      excludeReason: reason,
      placeKey: normalizePlaceKey(row.place),
    };
    rawRows.push(normalized);
    if (reason) excludedRows.push(normalized);
    else visibleRows.push(normalized);
  }

  return { rawRows, visibleRows, excludedRows };
}

function getExcludeReason(row) {
  const purpose = row.purpose || "";
  const place = row.place || "";

  const purposeKeyword = PURPOSE_EXCLUDE_KEYWORDS.find((keyword) => purpose.includes(keyword));
  if (purposeKeyword) return `집행목적 제외: ${purposeKeyword}`;

  const placeKeyword = PLACE_EXCLUDE_KEYWORDS.find((keyword) => place.includes(keyword));
  if (placeKeyword) return `집행장소 제외: ${placeKeyword}`;

  if (!place || place === "-" || place === "없음") return "집행장소 없음";
  return "";
}

function normalizePlaceKey(place) {
  return cleanCell(place)
    .replace(/주식회사/g, "")
    .replace(/\(주\)|㈜/g, "")
    .replace(/[()]/g, "")
    .replace(/[&·]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function groupByPlace(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = row.placeKey || normalizePlaceKey(row.place);
    if (!map.has(key)) {
      map.set(key, {
        key,
        place: row.place,
        rows: [],
        amount: 0,
        lat: null,
        lng: null,
        address: "",
        candidateCount: 0,
        status: "ready",
      });
    }
    const group = map.get(key);
    group.rows.push(row);
    group.amount += row.amount || 0;
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function renderTabs() {
  const tabs = state.mode === "mapped"
    ? [
        ["mapped", "표시 완료"],
        ["pending", "위치 확인"],
        ["excluded", "지도 제외"],
      ]
    : [
        ["target", "지도 대상"],
        ["excluded", "지도 제외"],
        ["all", "전체 정제표"],
      ];

  if (!tabs.some(([key]) => key === state.currentTab)) state.currentTab = tabs[0][0];
  elements.resultTabs.innerHTML = tabs.map(([key, label]) =>
    `<button class="tab ${key === state.currentTab ? "active" : ""}" data-tab="${key}" type="button">${label}</button>`
  ).join("");

  if (state.mode === "mapped") {
    elements.tableHint.textContent = "표시 완료 행을 누르면 지도에서 해당 사용처로 이동합니다.";
  } else if (state.mode === "parsed") {
    elements.tableHint.textContent = "자료 확인 상태입니다. 지도 대상·지도 제외·전체 정제표를 확인한 뒤 [지도 만들기]를 눌러주세요.";
  } else {
    elements.tableHint.textContent = "자료 확인하기를 누르면 지도 대상, 지도 제외, 전체 정제표를 볼 수 있습니다.";
  }
}

function setMapNotice(show) {
  if (!elements.mapNotice) return;
  elements.mapNotice.classList.toggle("hidden", !show);
  if (show && !state.map) {
    elements.map.classList.add("map-placeholder");
    elements.map.innerHTML = `<div><strong>아직 지도를 만들지 않았습니다.</strong><p>자료를 확인한 뒤 [지도 만들기]를 누르면 사용처 위치를 검색합니다.</p></div>`;
    elements.mapNotice.classList.add("hidden");
  }
}

function renderSummary() {
  const totalAmount = state.rawRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const targetAmount = state.visibleRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const mappedRows = getMappedRows();
  const mappedAmount = mappedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const excludedAmount = state.excludedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const hasSearchedMap = state.mode === "mapped";

  $("#totalCount").textContent = `${state.rawRows.length}`;
  $("#totalAmount").textContent = formatWon(totalAmount);
  $("#targetCount").textContent = `${state.visibleRows.length}건 · ${formatWon(targetAmount)}`;
  $("#mappedCount").textContent = hasSearchedMap ? `${mappedRows.length}건 · ${formatWon(mappedAmount)}` : "검색 전";
  $("#pendingCount").textContent = hasSearchedMap ? `${state.pendingRows.length}건` : "검색 전";
  $("#excludedCount").textContent = `${state.excludedRows.length}건 · ${formatWon(excludedAmount)}`;

  const mappedCard = $("#mappedCount")?.closest(".summary-card");
  const pendingCard = $("#pendingCount")?.closest(".summary-card");
  mappedCard?.classList.toggle("search-before", !hasSearchedMap);
  pendingCard?.classList.toggle("search-before", !hasSearchedMap);
}

function getGroupForRow(row) {
  return state.groupedPlaces.find((item) => item.key === row.placeKey);
}

function getMappedRows() {
  return state.visibleRows.filter((row) => getGroupForRow(row)?.status === "mapped");
}

function getMappedGroups() {
  return state.groupedPlaces.filter((group) => group.status === "mapped");
}

function renderTable() {
  const tab = state.currentTab;
  let rows = [];
  let columns = [];
  let colGroup = "";

  if (state.mode === "mapped") {
    if (tab === "mapped") {
      rows = getMappedRows();
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "지도상태"];
      colGroup = renderColGroup();
    } else if (tab === "excluded") {
      rows = state.excludedRows;
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "제외사유"];
      colGroup = renderColGroup();
    } else {
      rows = state.pendingRows;
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "확인내용"];
      colGroup = renderColGroup();
    }
  } else {
    if (tab === "target") {
      rows = state.visibleRows;
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "상태"];
      colGroup = renderColGroup();
    } else if (tab === "excluded") {
      rows = state.excludedRows;
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "제외사유"];
      colGroup = renderColGroup();
    } else {
      rows = state.rawRows;
      columns = ["집행일자", "집행장소", "집행금액", "집행목적", "정제결과"];
      colGroup = renderColGroup();
    }
  }

  if (!rows.length) {
    let message = "해당 내역이 없습니다.";
    if (!state.rawRows.length) message = "아직 정리된 자료가 없습니다. 표를 붙여넣고 자료 확인하기 또는 지도 만들기를 눌러주세요.";
    else if (state.mode === "mapped" && tab === "mapped") message = "아직 표시 완료된 장소가 없습니다. 위치 확인 내역을 확인해 주세요.";
    elements.tableWrap.className = "table-wrap empty-state";
    elements.tableWrap.innerHTML = `<p>${escapeHtml(message)}</p>`;
    return;
  }

  elements.tableWrap.className = "table-wrap";
  const body = rows.map((row) => {
    const group = getGroupForRow(row);
    const canJump = state.mode === "mapped" && tab === "mapped" && group?.status === "mapped";
    const status = getRowStatus(row, tab);
    return `<tr class="${canJump ? "map-row" : ""}" ${canJump ? `data-place-key="${escapeHtml(row.placeKey)}"` : ""}>
      <td>${escapeHtml(row.date)}</td>
      <td><strong>${escapeHtml(row.place)}</strong></td>
      <td class="amount">${formatWon(row.amount)}</td>
      <td><div class="purpose-cell" title="${escapeHtml(row.purpose)}">${escapeHtml(row.purpose)}</div></td>
      <td>${renderStatusBadge(status, tab, canJump, row.placeKey)}</td>
    </tr>`;
  }).join("");

  elements.tableWrap.innerHTML = `<table>
    ${colGroup}
    <thead><tr>${columns.map((col) => `<th>${col}</th>`).join("")}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function renderColGroup() {
  return `<colgroup>
    <col class="col-date" />
    <col class="col-place" />
    <col class="col-amount" />
    <col />
    <col class="col-action" />
  </colgroup>`;
}

function getRowStatus(row, tab) {
  if (state.mode !== "mapped") {
    if (tab === "target") return "지도 대상";
    if (tab === "excluded") return row.excludeReason;
    return row.excludeReason || "지도 대상";
  }

  if (tab === "mapped") return "표시 완료";
  if (tab === "excluded") return row.excludeReason;
  return row.locationStatus || "장소 검색 실패";
}

function renderStatusBadge(text, tab, canJump = false, placeKey = "") {
  let className = "";
  if (tab === "excluded") className = "gray";
  if (tab === "pending") className = "warn";

  if (canJump) {
    const group = state.groupedPlaces.find((item) => item.key === placeKey);
    const candidateText = group?.candidateCount > 1 ? ` · 후보 ${group.candidateCount}개` : "";
    const candidateTitle = group?.candidateCount > 1 ? `후보 ${group.candidateCount}개 중 선택됨` : "지도에 표시 완료";
    return `<span class="badge" title="${escapeHtml(candidateTitle)}">표시 완료${escapeHtml(candidateText)}</span>`;
  }
  return `<span class="badge ${className}">${escapeHtml(text || "-")}</span>`;
}

function handleInfoWindowClose(event) {
  const button = event.target.closest(".info-close");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const placeKey = button.dataset.placeKey;
  closeInfoWindow(placeKey);
}

function closeInfoWindow(placeKey) {
  if (placeKey) {
    const group = state.groupedPlaces.find((item) => item.key === placeKey);
    group?.infowindow?.close();
    setStatus(`${group?.place || "마커"} 정보창을 닫았습니다.`);
    return;
  }
  state.infowindows.forEach((item) => item.close());
}

function handleTableClick(event) {
  const target = event.target.closest("[data-place-key]");
  if (!target) return;
  const placeKey = target.dataset.placeKey;
  focusPlaceOnMap(placeKey);
}

function focusPlaceOnMap(placeKey) {
  const group = state.groupedPlaces.find((item) => item.key === placeKey && item.status === "mapped");
  if (!group || !state.map || !group.marker) return;

  state.infowindows.forEach((item) => item.close());
  const position = group.marker.getPosition();
  state.map.panTo(position);
  if (state.map.getLevel() > 4) state.map.setLevel(4);
  group.infowindow?.open(state.map, group.marker);

  elements.tableWrap.querySelectorAll("tr.row-focus").forEach((row) => row.classList.remove("row-focus"));
  elements.tableWrap.querySelectorAll(`tr[data-place-key="${CSS.escape(placeKey)}"]`).forEach((row) => row.classList.add("row-focus"));
  setStatus(`${group.place} 위치로 이동했습니다.`);
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function setStatus(message, isError = false) {
  elements.statusText.textContent = message;
  elements.statusText.style.color = isError ? "#c2410c" : "#687386";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadKakaoMap(key) {
  return new Promise((resolve, reject) => {
    if (window.kakao && window.kakao.maps && state.kakaoLoaded) {
      resolve();
      return;
    }

    const existing = document.querySelector("script[data-kakao-map]");
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.dataset.kakaoMap = "true";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        reject(new Error("카카오맵 SDK를 불러오지 못했습니다. JavaScript 키와 도메인 등록을 확인해 주세요."));
        return;
      }
      window.kakao.maps.load(() => {
        state.kakaoLoaded = true;
        resolve();
      });
    };
    script.onerror = () => reject(new Error("카카오맵 SDK 로딩에 실패했습니다. 키와 네트워크 상태를 확인해 주세요."));
    document.head.appendChild(script);
  });
}

function initMapIfNeeded() {
  if (state.map) return;
  elements.map.classList.remove("map-placeholder");
  elements.map.innerHTML = "";
  const defaultCenter = new kakao.maps.LatLng(37.5665, 126.9780);
  state.map = new kakao.maps.Map(elements.map, {
    center: defaultCenter,
    level: 6,
  });
}

async function searchPlacesAndRenderMarkers() {
  clearMarkers();
  state.pendingRows = [];
  const places = new kakao.maps.services.Places();
  state.bounds = new kakao.maps.LatLngBounds();

  for (const group of state.groupedPlaces) {
    setStatus(`위치 검색 중: ${group.place}`);
    const result = await searchPlaceForGroup(places, group);
    if (result) {
      group.lat = Number(result.y);
      group.lng = Number(result.x);
      group.address = result.road_address_name || result.address_name || "";
      group.searchQuery = result.searchQuery || "";
      group.candidateCount = result.candidateCount || 1;
      group.status = "mapped";
      createMarker(group);
    } else {
      group.status = "pending";
      for (const row of group.rows) {
        state.pendingRows.push({ ...row, locationStatus: `장소 검색 실패 · ${getEffectiveAreaHint()} 기준` });
      }
    }
  }

  fitMapToMarkers();
}

function searchPlaceForGroup(places, group) {
  const schoolName = elements.schoolName.value.trim();
  const areaHint = getEffectiveAreaHint();
  const broadHint = getBroadAreaHint(areaHint);
  const placeQueries = makePlaceSearchNames(group.place);
  const prefixes = uniqueValues([areaHint, broadHint, schoolName, ""]);
  const queries = [];

  for (const place of placeQueries) {
    for (const prefix of prefixes) {
      const query = normalizeSearchQuery([prefix, place].filter(Boolean).join(" "));
      if (query && !queries.includes(query)) queries.push(query);
    }
  }

  return tryQueries(places, queries, areaHint);
}

function uniqueValues(values) {
  return values
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, array) => array.indexOf(item) === index);
}

function getEffectiveAreaHint() {
  const userHint = normalizeAreaHint(elements.areaHint?.value?.trim() || "");
  if (userHint) return userHint;
  return getSchoolRegionHint(elements.schoolName?.value?.trim() || "") || DEFAULT_REGION_HINT;
}

function getSchoolRegionHint(schoolName) {
  const name = String(schoolName || "").replace(/\s+/g, "");
  if (!name) return DEFAULT_REGION_HINT;

  // 대청중학교는 서울 강남구 대치동 소재입니다. 학교명이 짧게 입력되어도 강남구 기준으로 검색합니다.
  if (/대청중(학교)?/.test(name)) return "서울특별시 강남구";

  const districtMap = {
    강남: "서울특별시 강남구",
    서초: "서울특별시 서초구",
    송파: "서울특별시 송파구",
    강동: "서울특별시 강동구",
    강서: "서울특별시 강서구",
    양천: "서울특별시 양천구",
    구로: "서울특별시 구로구",
    금천: "서울특별시 금천구",
    영등포: "서울특별시 영등포구",
    동작: "서울특별시 동작구",
    관악: "서울특별시 관악구",
    마포: "서울특별시 마포구",
    서대문: "서울특별시 서대문구",
    은평: "서울특별시 은평구",
    종로: "서울특별시 종로구",
    중구: "서울특별시 중구",
    용산: "서울특별시 용산구",
    성동: "서울특별시 성동구",
    광진: "서울특별시 광진구",
    동대문: "서울특별시 동대문구",
    중랑: "서울특별시 중랑구",
    성북: "서울특별시 성북구",
    강북: "서울특별시 강북구",
    도봉: "서울특별시 도봉구",
    노원: "서울특별시 노원구",
  };

  for (const [keyword, region] of Object.entries(districtMap)) {
    if (name.includes(keyword)) return region;
  }
  return DEFAULT_REGION_HINT;
}

function normalizeAreaHint(value) {
  let hint = String(value || "").replace(/\s+/g, " ").trim();
  if (!hint) return "";
  if (/^서울\s/.test(hint)) hint = hint.replace(/^서울\s+/, "서울특별시 ");
  if (/^[가-힣]+구$/.test(hint)) hint = `서울특별시 ${hint}`;
  return hint;
}

function getBroadAreaHint(areaHint) {
  const hint = String(areaHint || "");
  if (hint.includes("서울")) return DEFAULT_REGION_HINT;
  return "";
}

function normalizeSearchQuery(value) {
  return String(value || "")
    .replace(/[\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makePlaceSearchNames(place) {
  const original = cleanCell(place);
  const variants = [original];
  const noCorp = original
    .replace(/주식회사/g, "")
    .replace(/\(주\)|㈜/g, "")
    .trim();
  const spaced = noCorp
    .replace(/[()]/g, " ")
    .replace(/[&·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const noBranchParen = noCorp.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();

  [noCorp, spaced, noBranchParen].forEach((item) => {
    if (item && !variants.includes(item)) variants.push(item);
  });
  return variants;
}

async function tryQueries(places, queries, areaHint = "") {
  for (const query of queries) {
    const docs = await keywordSearch(places, query);
    if (docs.length > 0) {
      const picked = pickBestPlaceCandidate(docs, areaHint);
      return { ...picked, candidateCount: docs.length, searchQuery: query };
    }
  }
  return null;
}

function pickBestPlaceCandidate(docs, areaHint) {
  const normalizedHint = String(areaHint || "").replace(/\s+/g, "");
  const isSeoulSearch = normalizedHint.includes("서울");
  const districtMatch = normalizedHint.match(/([가-힣]+구)/);
  const district = districtMatch ? districtMatch[1] : "";

  return [...docs].sort((a, b) => {
    const scoreA = scorePlaceCandidate(a, { isSeoulSearch, district });
    const scoreB = scorePlaceCandidate(b, { isSeoulSearch, district });
    return scoreB - scoreA;
  })[0];
}

function scorePlaceCandidate(item, { isSeoulSearch, district }) {
  const address = `${item.road_address_name || ""} ${item.address_name || ""}`;
  let score = 0;
  if (isSeoulSearch && address.includes("서울")) score += 100;
  if (district && address.includes(district)) score += 80;
  if (item.category_group_code === "FD6") score += 8;
  if (item.category_name?.includes("음식점")) score += 6;
  if (item.road_address_name) score += 3;
  if (isSeoulSearch && address && !address.includes("서울")) score -= 50;
  return score;
}

function keywordSearch(places, query) {
  return new Promise((resolve) => {
    places.keywordSearch(query, (data, status) => {
      if (status === kakao.maps.services.Status.OK) {
        resolve(data || []);
      } else {
        resolve([]);
      }
    }, { size: 10 });
  });
}

function createMarker(group) {
  const position = new kakao.maps.LatLng(group.lat, group.lng);
  const marker = new kakao.maps.Marker({
    map: state.map,
    position,
    title: group.place,
  });

  const details = group.rows.slice(0, 5).map((row) => `<li>${escapeHtml(row.date)} · ${formatWon(row.amount)}</li>`).join("");
  const more = group.rows.length > 5 ? `<li>외 ${group.rows.length - 5}건</li>` : "";
  const content = `<div class="info-window">
    <button type="button" class="info-close" data-place-key="${escapeHtml(group.key)}" aria-label="정보창 닫기">×</button>
    <strong>${escapeHtml(group.place)}</strong>
    <div>${group.rows.length}건 · ${formatWon(group.amount)}</div>
    <div>${escapeHtml(group.address)}</div>
    <ul>${details}${more}</ul>
  </div>`;
  const infowindow = new kakao.maps.InfoWindow({ content });

  kakao.maps.event.addListener(marker, "click", () => {
    state.infowindows.forEach((item) => item.close());
    infowindow.open(state.map, marker);
  });

  group.marker = marker;
  group.infowindow = infowindow;
  state.markers.push(marker);
  state.infowindows.push(infowindow);
  state.bounds.extend(position);
}

function clearMarkers() {
  state.markers.forEach((marker) => marker.setMap(null));
  state.infowindows.forEach((infowindow) => infowindow.close());
  state.groupedPlaces.forEach((group) => {
    group.marker = null;
    group.infowindow = null;
  });
  state.markers = [];
  state.infowindows = [];
  state.bounds = null;
}

function fitMapToMarkers() {
  if (!state.map || !state.markers.length || !state.bounds) return;
  state.map.setBounds(state.bounds);
}
