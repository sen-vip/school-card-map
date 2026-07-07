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
const SCHOOL_INFO_ENDPOINT = "/api/school_info";
// 브라우저에서 사용하는 카카오 JavaScript 키입니다.
// REST API 키/Admin 키가 아니며, 카카오 개발자센터의 JavaScript SDK 도메인 제한으로 보호합니다.
const DEFAULT_KAKAO_JS_KEY = "9a75b8f0e12044be3f4588a0f3c728b5";
const DEFAULT_REGION_HINT = "서울특별시";
const DEFAULT_MONTH_MODE_KEY = "schoolCardMapDefaultMonthMode";
const DEFAULT_MONTH_MODE = "previous-month-v1.2.11";
const DISPLAY_STATUSES = ["mapped", "manual", "needs_review"];
// 학교명 글자만 보고 자치구를 추정하면 구암중→중구처럼 오판할 수 있습니다.
// 지역은 학교 주소 조회 결과에서만 확정하고, 아래 값은 주소 조회 실패 시 예시 학교 보조용으로만 사용합니다.
const SCHOOL_REGION_FALLBACKS = {
  "대청중": "서울특별시 강남구",
  "대청중학교": "서울특별시 강남구",
  "금천고": "서울특별시 금천구",
  "금천고등학교": "서울특별시 금천구",
};

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
  schoolRegionHint: "",
  schoolRegionSource: "default",
  schoolRegionSchool: "",
  workflowRunning: false,
  schoolCheckTimer: null,
  manualEditPlaceKey: "",
  manualSearchCandidates: [],
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  schoolName: $("#schoolName"),
  schoolStatus: $("#schoolStatus"),
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
  workflowSteps: $("#workflowSteps"),
  manualCount: $("#manualCount"),
  failedCount: $("#failedCount"),
  locationModal: $("#locationModal"),
  locationModalTitle: $("#locationModalTitle"),
  locationSearchInput: $("#locationSearchInput"),
  locationCandidateList: $("#locationCandidateList"),
  locationSearchBtn: $("#locationSearchBtn"),
  locationCloseBtn: $("#locationCloseBtn"),
};

init();

function init() {
  // 기본 카카오 JavaScript 키가 내장되어 있으므로 일반 사용자는 키를 입력하지 않아도 됩니다.
  // 사용자가 직접 저장한 키가 있으면 고급 설정에서 override 용도로만 표시합니다.
  elements.kakaoKey.value = localStorage.getItem("schoolCardMapKakaoKey") || "";
  elements.schoolName.value = localStorage.getItem("schoolCardMapSchoolName") || "";
  // 지역 보조어는 학교별로 달라지므로 이전 학교의 값을 자동 적용하지 않습니다.
  localStorage.removeItem("schoolCardMapAreaHint");
  elements.areaHint.value = "";
  const savedBaseMonth = localStorage.getItem("schoolCardMapBaseMonth") || "";
  elements.baseMonth.value = getInitialBaseMonth(savedBaseMonth);
  if (elements.senSourceUrl) elements.senSourceUrl.value = localStorage.getItem("schoolCardMapSenSourceUrl") || SEN_DEFAULT_URL;
  // v1.1.4: 이전 버전에서 저장된 /sen-proxy?url= 값이 자동 불러오기를 막지 않도록 강제로 /sen-fetch를 사용합니다.
  localStorage.removeItem("schoolCardMapSenProxyUrl");
  if (elements.senProxyUrl) elements.senProxyUrl.value = AUTO_FETCH_ENDPOINT;
  updateMapSettingStatus();

  $("#purposeRules").textContent = PURPOSE_EXCLUDE_KEYWORDS.join(", ");
  $("#placeRules").textContent = PLACE_EXCLUDE_KEYWORDS.join(", ");

  elements.makeMapBtn.addEventListener("click", () => run({ withMap: true }));
  elements.ctaMapBtn?.addEventListener("click", runFullWorkflow);
  elements.parseOnlyBtn.addEventListener("click", () => run({ withMap: false }));
  elements.fetchSenBtn?.addEventListener("click", runFullWorkflow);
  elements.openSenBtn?.addEventListener("click", () => window.open(elements.senSourceUrl?.value || SEN_DEFAULT_URL, "_blank", "noopener"));
  elements.sampleBtn.addEventListener("click", insertSample);
  elements.clearBtn.addEventListener("click", clearAll);
  elements.fitMapBtn.addEventListener("click", fitMapToMarkers);
  elements.tableWrap.addEventListener("click", handleTableClick);
  document.addEventListener("click", handleInfoWindowClose);
  elements.locationSearchBtn?.addEventListener("click", searchManualLocationCandidates);
  elements.locationCloseBtn?.addEventListener("click", closeLocationEditor);
  elements.locationModal?.addEventListener("click", handleLocationModalClick);
  elements.locationSearchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchManualLocationCandidates();
    }
  });

  [elements.kakaoKey, elements.schoolName, elements.areaHint, elements.baseMonth, elements.senSourceUrl, elements.senProxyUrl].filter(Boolean).forEach((input) => {
    input.addEventListener("change", saveSettings);
  });
  elements.kakaoKey?.addEventListener("input", updateKeyStatus);
  elements.schoolName?.addEventListener("input", handleSchoolNameInput);
  elements.schoolName?.addEventListener("blur", () => resolveSchoolRegionHint({ force: true }));
  elements.schoolName?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      resolveSchoolRegionHint({ force: true });
    }
  });
  elements.areaHint?.addEventListener("input", updateMapSettingStatus);

  elements.resultTabs.addEventListener("click", (event) => {
    const button = event.target.closest(".tab");
    if (!button) return;
    state.currentTab = button.dataset.tab;
    $$(".tab").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderTable();
  });

  renderTabs();
  updateSchoolStatus();
}

function getInitialBaseMonth(savedValue) {
  const saved = String(savedValue || "").trim();
  const defaultMonth = getPreviousMonth();
  const currentMonth = getCurrentMonth();
  const migrated = localStorage.getItem(DEFAULT_MONTH_MODE_KEY) === DEFAULT_MONTH_MODE;

  // v1.2.11 안정화: init() 실행 전에 사용하는 상수를 먼저 선언하고,
  // 예전 버전에서 자동 저장된 이번 달 값은 한 번만 지난달로 보정합니다.
  if (!migrated) {
    localStorage.setItem(DEFAULT_MONTH_MODE_KEY, DEFAULT_MONTH_MODE);
    if (!isMonthValue(saved) || saved === currentMonth) {
      localStorage.setItem("schoolCardMapBaseMonth", defaultMonth);
      return defaultMonth;
    }
  }

  if (!isMonthValue(saved)) {
    localStorage.setItem("schoolCardMapBaseMonth", defaultMonth);
    return defaultMonth;
  }

  return saved;
}

function isMonthValue(value) {
  return /^\d{4}-\d{2}$/.test(String(value || ""));
}

function getCurrentMonth() {
  const now = new Date();
  return formatMonthValue(now.getFullYear(), now.getMonth() + 1);
}

function getPreviousMonth() {
  const now = new Date();
  const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return formatMonthValue(previous.getFullYear(), previous.getMonth() + 1);
}

function formatMonthValue(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function saveSettings() {
  const userKakaoKey = elements.kakaoKey.value.trim();
  if (userKakaoKey) localStorage.setItem("schoolCardMapKakaoKey", userKakaoKey);
  else localStorage.removeItem("schoolCardMapKakaoKey");
  localStorage.setItem("schoolCardMapSchoolName", elements.schoolName.value.trim());
  // 지역 보조어는 학교 변경 시 오염을 막기 위해 저장하지 않습니다.
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
  const sourceText = getRegionSourceText();
  elements.regionStatus.textContent = `검색 지역: ${region}${sourceText ? ` · ${sourceText}` : ""}`;
  elements.regionStatus.classList.toggle("ready", Boolean(region));
}

function getRegionSourceText() {
  if (elements.areaHint?.value?.trim()) return "직접 입력";
  if (state.schoolRegionSource === "neis") return "학교 주소 확인";
  if (state.schoolRegionSource === "kakao") return "지도 장소 확인";
  if (state.schoolRegionSource === "fallback") return "보조값";
  return "기본값";
}

function stripStaticDots(message) {
  return String(message ?? "").replace(/\s*\.{1,3}$/, "");
}

function isBusyStatusMessage(message, isError = false) {
  if (isError) return false;
  const text = String(message ?? "");
  return /(확인하는 중|확인 중|가져오는 중|불러오는 중|수집하는 중|정리하는 중|검색 중|위치 검색 중|만드는 중|처리 중|실행 중)/.test(text);
}

function setLoadingDots(element, isBusy) {
  if (!element) return;
  element.classList.toggle("loading-dots", Boolean(isBusy));
  if (isBusy) element.setAttribute("aria-busy", "true");
  else element.removeAttribute("aria-busy");
}

function updateSchoolStatus(message, tone = "neutral") {
  if (!elements.schoolStatus) return;
  const schoolName = elements.schoolName?.value?.trim();
  const region = getEffectiveAreaHint();
  const defaultMessage = schoolName
    ? `${region} 기준으로 검색합니다.`
    : "학교 확인 전 · 학교명을 입력하면 검색 지역을 자동으로 잡습니다.";
  const displayMessage = message || defaultMessage;
  const isBusy = tone === "loading" || isBusyStatusMessage(displayMessage);
  elements.schoolStatus.textContent = stripStaticDots(displayMessage);
  elements.schoolStatus.dataset.tone = tone;
  setLoadingDots(elements.schoolStatus, isBusy);
}

function handleSchoolNameInput() {
  state.schoolRegionHint = "";
  state.schoolRegionSource = "default";
  state.schoolRegionSchool = "";
  if (elements.areaHint && !document.querySelector(".settings-details")?.open) {
    elements.areaHint.value = "";
  }
  updateMapSettingStatus();
  const schoolName = elements.schoolName?.value?.trim() || "";
  updateSchoolStatus(schoolName ? "학교 주소 확인 대기 중 · Enter 또는 사용처 지도 만들기를 누르세요." : undefined, "neutral");
  clearTimeout(state.schoolCheckTimer);
  if (schoolName.length >= 2) {
    state.schoolCheckTimer = setTimeout(() => resolveSchoolRegionHint({ force: true }), 700);
  }
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
  const mappedRows = getAutoMappedRows();
  const displayedRows = getDisplayedRows();
  const mappedAmount = displayedRows.reduce((sum, row) => sum + (row.amount || 0), 0);

  if (mode === "mapped") {
    elements.nextActionBadge.textContent = "지도 생성 완료";
    elements.nextActionTitle.textContent = `${schoolName} ${baseMonth} 사용처 지도를 만들었습니다.`;
    const reviewCount = getReviewRows().length;
    const failedCount = getFailedRows().length;
    const manualCount = getManualRows().length;
    elements.nextActionDesc.textContent = `지도 표시 ${displayedRows.length}건 · ${formatWon(mappedAmount)}입니다. 이 중 확인 필요 ${reviewCount}건, 수동 확인 ${manualCount}건, 검색 실패 ${failedCount}건입니다.`;
    elements.ctaMapBtn.innerHTML = `<small>다시</small> 사용처 지도 다시 만들기`;
    elements.nextActionPanel.classList.add("complete");
  } else {
    elements.nextActionBadge.textContent = "다음 단계";
    elements.nextActionTitle.textContent = `${schoolName} ${baseMonth} 자료 확인이 완료되었습니다.`;
    elements.nextActionDesc.textContent = `전체 ${state.rawRows.length}건 중 지도 대상 ${state.visibleRows.length}건 · ${formatWon(targetAmount)}, 지도 제외 ${state.excludedRows.length}건 · ${formatWon(excludedAmount)}입니다. 위의 [사용처 지도 만들기] 버튼으로 지도까지 이어서 만들 수 있습니다.`;
    elements.ctaMapBtn.innerHTML = `<small>지도</small> 사용처 지도 만들기`;
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
  setStatus("예시 자료를 넣었습니다. [사용처 지도 만들기]를 누르면 자료 확인과 지도 생성이 이어서 실행됩니다.");
}

function clearAll() {
  if (!confirm("입력한 표와 결과를 모두 지울까요?")) return;
  elements.rawInput.value = "";
  state.rawRows = [];
  state.visibleRows = [];
  state.excludedRows = [];
  state.pendingRows = [];
  state.groupedPlaces = [];
  state.manualEditPlaceKey = "";
  state.manualSearchCandidates = [];
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

async function run({ withMap, skipResolveRegion = false }) {
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
    setStatus("자료 확인이 완료되었습니다. 사용처 지도 만들기를 누르면 사용처 위치를 검색합니다.");
    return;
  }

  if (!skipResolveRegion) {
    await resolveSchoolRegionHint({ force: false });
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
    const mappedGroups = getDisplayGroups();
    const reviewGroups = getReviewGroups();
    const failedGroups = getFailedGroups();
    const message = reviewGroups.length || failedGroups.length
      ? `사용처 지도를 만들었어요. 지도 표시 ${mappedGroups.length}곳 중 ${reviewGroups.length}곳은 위치 확인이 필요하고, 검색 실패 ${failedGroups.length}곳은 전체 탭에서 다시 검색할 수 있습니다.`
      : `사용처 지도를 만들었어요. 모든 위치가 정상 표시되었습니다. 지도 표시 ${mappedGroups.length}곳입니다.`;
    setStatus(message);
  } catch (error) {
    console.error(error);
    state.mode = "parsed";
    state.currentTab = "target";
    renderTabs();
    renderSummary();
    renderTable();
    setMapNotice(true);
    updateNextAction("parsed");
    setStatus(error.message || "지도 표시 중 오류가 발생했습니다.", true);
    throw error;
  }
}


function setWorkflowStep(activeStep, tone = "active") {
  if (!elements.workflowSteps) return;
  const order = ["school", "fetch", "parse", "map", "done"];
  const activeIndex = order.indexOf(activeStep);
  elements.workflowSteps.querySelectorAll("li").forEach((item) => {
    const index = order.indexOf(item.dataset.step);
    item.classList.remove("active", "done", "error");
    if (tone === "error" && item.dataset.step === activeStep) item.classList.add("error");
    else if (index >= 0 && activeIndex >= 0 && index < activeIndex) item.classList.add("done");
    else if (item.dataset.step === activeStep) item.classList.add(tone === "done" ? "done" : "active");
  });
}

function resetWorkflowSteps() {
  if (!elements.workflowSteps) return;
  elements.workflowSteps.querySelectorAll("li").forEach((item) => item.classList.remove("active", "done", "error"));
}

function setMainButtonLoading(isLoading) {
  state.workflowRunning = isLoading;
  [elements.fetchSenBtn, elements.ctaMapBtn].filter(Boolean).forEach((button) => {
    button.disabled = isLoading;
    button.classList.toggle("is-loading", isLoading);
    if (isLoading) button.setAttribute("aria-busy", "true");
    else button.removeAttribute("aria-busy");
  });
  if (elements.fetchSenBtn) {
    elements.fetchSenBtn.innerHTML = isLoading
      ? `<small>진행</small> 만드는 중`
      : `<small>시작</small> 사용처 지도 만들기`;
  }
}

async function runFullWorkflow() {
  if (state.workflowRunning) return;
  saveSettings();
  const schoolName = elements.schoolName.value.trim();
  const baseMonth = elements.baseMonth.value.trim();

  if (!schoolName) {
    setAutoStatus("학교명을 입력해 주세요.", true);
    updateSchoolStatus("학교명을 입력해 주세요.", "error");
    return;
  }
  if (!baseMonth) {
    setAutoStatus("기준월을 선택해 주세요.", true);
    return;
  }

  try {
    setMainButtonLoading(true);
    setWorkflowStep("school");
    setAutoStatus("학교 지역을 확인하는 중입니다...");
    const region = await resolveSchoolRegionHint({ force: true });
    setAutoStatus(`검색 지역을 ${region} 기준으로 설정했습니다. 서울교육청 자료를 가져오는 중입니다...`);

    setWorkflowStep("fetch");
    const rows = await collectSenRows({ schoolName, baseMonth });
    if (!rows.length) {
      setWorkflowStep("fetch", "error");
      setAutoStatus("해당 학교명과 기준월의 업무추진비 공개자료를 찾지 못했습니다. 학교명 또는 기준월을 확인해 주세요.", true);
      return;
    }

    elements.rawInput.value = rowsToTsv(rows);
    setWorkflowStep("parse");
    setAutoStatus(`${rows.length}건을 가져왔습니다. 지도 대상과 제외 항목을 정리하는 중입니다...`);

    setWorkflowStep("map");
    await run({ withMap: true, skipResolveRegion: true });
    setWorkflowStep("done", "done");
    setAutoStatus(`${schoolName} ${formatDisplayMonth(baseMonth)} 사용처 지도를 만들었습니다.`);
  } catch (error) {
    console.error(error);
    setWorkflowStep("map", "error");
    setAutoStatus(formatAutoFetchError(error), true);
    setStatus(error.message || "사용처 지도 만들기 중 오류가 발생했습니다.", true);
  } finally {
    setMainButtonLoading(false);
  }
}

function setAutoStatus(message, isError = false) {
  if (!elements.autoStatusText) return;
  const isBusy = isBusyStatusMessage(message, isError);
  elements.autoStatusText.textContent = stripStaticDots(message);
  elements.autoStatusText.style.color = isError ? "#c2410c" : "#687386";
  setLoadingDots(elements.autoStatusText, isBusy);
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

  if (base.includes("카카오") || base.includes("지도") || base.includes("SDK")) {
    return `${base} 카카오 개발자센터의 JavaScript SDK 도메인에 현재 Vercel 주소가 등록되어 있는지 확인해 주세요.`;
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
    setStatus("자료를 가져왔습니다. [사용처 지도 만들기]를 누르면 위치 검색까지 이어서 실행됩니다.");
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
        ["mapped", "지도 표시 대상"],
        ["excluded", "지도 제외"],
        ["all", "전체"],
      ]
    : [
        ["target", "지도 대상"],
        ["excluded", "지도 제외"],
        ["all", "전체"],
      ];

  if (!tabs.some(([key]) => key === state.currentTab)) state.currentTab = tabs[0][0];
  elements.resultTabs.innerHTML = tabs.map(([key, label]) =>
    `<button class="tab ${key === state.currentTab ? "active" : ""}" data-tab="${key}" type="button">${label}</button>`
  ).join("");

  if (state.mode === "mapped") {
    elements.tableHint.textContent = "지도에 표시된 사용처입니다. 애매한 항목만 위치를 확인해 주세요.";
  } else if (state.mode === "parsed") {
    elements.tableHint.textContent = "자료 확인 상태입니다. 위의 [사용처 지도 만들기] 버튼으로 지도까지 한 번에 만들 수 있습니다.";
  } else {
    elements.tableHint.textContent = "학교명과 기준월을 입력하고 [사용처 지도 만들기]를 누르면 자료 수집과 지도 생성이 이어집니다.";
  }
}

function setMapNotice(show) {
  if (!elements.mapNotice) return;
  elements.mapNotice.classList.toggle("hidden", !show);
  if (show && !state.map) {
    elements.map.classList.add("map-placeholder");
    elements.map.innerHTML = `<div><strong>아직 지도를 만들지 않았습니다.</strong><p>자료를 확인한 뒤 [사용처 지도 만들기]를 누르면 사용처 위치를 검색합니다.</p></div>`;
    elements.mapNotice.classList.add("hidden");
  }
}

function renderSummary() {
  const totalAmount = state.rawRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const targetAmount = state.visibleRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const mappedRows = getAutoMappedRows();
  const manualRows = getManualRows();
  const reviewRows = getReviewRows();
  const failedRows = getFailedRows();
  const displayedRows = getDisplayedRows();
  const displayedAmount = displayedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const mappedAmountOnly = mappedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const excludedAmount = state.excludedRows.reduce((sum, row) => sum + (row.amount || 0), 0);
  const hasSearchedMap = state.mode === "mapped";

  $("#totalCount").textContent = `${state.rawRows.length}`;
  $("#totalAmount").textContent = formatWon(totalAmount);
  $("#targetCount").textContent = `${state.visibleRows.length}건 · ${formatWon(targetAmount)}`;
  $("#mappedCount").textContent = hasSearchedMap ? `${displayedRows.length}건 · ${formatWon(displayedAmount)}` : "검색 전";
  if (elements.manualCount) elements.manualCount.textContent = hasSearchedMap ? `${manualRows.length}건` : "검색 전";
  $("#pendingCount").textContent = hasSearchedMap ? `${reviewRows.length}건` : "검색 전";
  if (elements.failedCount) elements.failedCount.textContent = hasSearchedMap ? `${failedRows.length}건` : "검색 전";
  $("#excludedCount").textContent = `${state.excludedRows.length}건 · ${formatWon(excludedAmount)}`;

  const cards = ["#mappedCount", "#manualCount", "#pendingCount", "#failedCount"]
    .map((selector) => $(selector)?.closest(".summary-card"))
    .filter(Boolean);
  cards.forEach((card) => card.classList.toggle("search-before", !hasSearchedMap));
}

function getGroupForRow(row) {
  return state.groupedPlaces.find((item) => item.key === row.placeKey);
}

function getRowsByGroupStatus(statuses) {
  const allowed = Array.isArray(statuses) ? statuses : [statuses];
  return state.visibleRows.filter((row) => allowed.includes(getGroupForRow(row)?.status));
}

function getAutoMappedRows() {
  return getRowsByGroupStatus("mapped");
}

function getManualRows() {
  return getRowsByGroupStatus("manual");
}

function getDisplayedRows() {
  return getRowsByGroupStatus(DISPLAY_STATUSES);
}

function getReviewRows() {
  return getRowsByGroupStatus("needs_review");
}

function getFailedRows() {
  return getRowsByGroupStatus("failed");
}

function getMappedRows() {
  return getDisplayedRows();
}

function getMappedGroups() {
  return state.groupedPlaces.filter((group) => ["mapped", "manual", "needs_review"].includes(group.status) && Number.isFinite(group.lat) && Number.isFinite(group.lng));
}

function getDisplayGroups() {
  return state.groupedPlaces.filter((group) => DISPLAY_STATUSES.includes(group.status));
}

function getReviewGroups() {
  return state.groupedPlaces.filter((group) => group.status === "needs_review");
}

function getFailedGroups() {
  return state.groupedPlaces.filter((group) => group.status === "failed");
}

function renderTable() {
  const tab = state.currentTab;
  let rows = [];

  if (state.mode === "mapped") {
    if (tab === "mapped") rows = getDisplayedRows();
    else if (tab === "excluded") rows = state.excludedRows;
    else rows = state.rawRows;
  } else {
    if (tab === "target") rows = state.visibleRows;
    else if (tab === "excluded") rows = state.excludedRows;
    else rows = state.rawRows;
  }

  if (!rows.length) {
    let message = "해당 내역이 없습니다.";
    if (!state.rawRows.length) message = "아직 정리된 자료가 없습니다. 학교명과 기준월을 입력하고 사용처 지도 만들기를 눌러주세요.";
    else if (state.mode === "mapped" && tab === "mapped") message = "지도에 표시된 장소가 없습니다. 전체에서 검색 실패 내역을 확인해 주세요.";
    else if (state.mode === "mapped" && tab === "excluded") message = "지도 제외 내역이 없습니다.";
    elements.tableWrap.className = "place-list-wrap empty-state";
    elements.tableWrap.innerHTML = `<p>${escapeHtml(message)}</p>`;
    return;
  }

  elements.tableWrap.className = "place-list-wrap";
  elements.tableWrap.innerHTML = `<div class="place-list" role="list">${rows.map((row) => renderPlaceCard(row, tab)).join("")}</div>`;
}

function renderPlaceCard(row, tab) {
  const group = getGroupForRow(row);
  const isDisplayed = state.mode === "mapped" && DISPLAY_STATUSES.includes(group?.status);
  const canJump = isDisplayed && group?.marker;
  const toneClass = getRowToneClass(group, tab, row).replace("row-", "card-");
  const status = getCardStatusMeta(group, row, tab);
  const purpose = row.purpose || "집행목적 없음";
  const info = getCardMapInfo(group, row, tab);
  const action = renderCardAction(group, row, tab);
  const titleAttr = canJump ? "지도에서 위치 보기" : "";

  return `<article class="place-card ${toneClass} ${canJump ? "map-card" : ""}" role="listitem" ${canJump ? `data-place-key="${escapeHtml(row.placeKey)}" title="${titleAttr}"` : ""}>
    <div class="place-card-main">
      <div class="place-card-head">
        <div class="place-title-wrap">
          <span class="badge ${status.className}">${escapeHtml(status.label)}</span>
          <strong class="place-title">${escapeHtml(row.place || "-")}</strong>
        </div>
        <strong class="place-amount">${formatWon(row.amount)}</strong>
      </div>
      <p class="place-meta">${escapeHtml(row.date || "-")} · ${escapeHtml(truncateText(purpose, 42))}</p>
      <div class="place-map-info">
        <span>${escapeHtml(info.label)}</span>
        <strong>${escapeHtml(info.primary)}</strong>
        ${info.secondary ? `<em>${escapeHtml(info.secondary)}</em>` : ""}
      </div>
    </div>
    ${action ? `<div class="place-card-actions">${action}</div>` : ""}
  </article>`;
}

function getCardStatusMeta(group, row, tab) {
  if (row?.excludeReason && (!group || tab === "excluded" || state.currentTab === "all")) {
    return { label: "지도 제외", className: "gray" };
  }
  if (!group || state.mode !== "mapped") {
    return { label: row?.excludeReason ? "지도 제외" : "지도 대상", className: row?.excludeReason ? "gray" : "" };
  }
  if (group.status === "manual") return { label: "수동 확인", className: "manual" };
  if (group.status === "needs_review") return { label: "확인 필요", className: "warn" };
  if (group.status === "failed") return { label: "검색 실패", className: "danger" };
  return { label: "표시 완료", className: "" };
}

function getCardMapInfo(group, row, tab) {
  if (row?.excludeReason && (tab === "excluded" || !group)) {
    return { label: "제외 사유", primary: row.excludeReason, secondary: "지도에 표시하지 않는 항목입니다." };
  }
  if (!group || state.mode !== "mapped") {
    return { label: "정제 상태", primary: row?.excludeReason || "지도 대상", secondary: "사용처 지도 만들기 후 위치가 표시됩니다." };
  }
  if (group.status === "failed") {
    return { label: "검색 결과", primary: group.reviewReason || "장소 검색 결과가 없습니다.", secondary: "다시 검색으로 위치를 직접 선택할 수 있습니다." };
  }
  if (group.status === "needs_review") {
    return { label: "지도 위치", primary: group.placeName || group.address || "위치 확인 필요", secondary: group.reviewReason || group.address || "위치가 맞는지 확인해 주세요." };
  }
  if (group.status === "manual") {
    return { label: "지도 위치", primary: group.placeName || group.address || "수동 확인 완료", secondary: group.address || "직접 선택한 위치입니다." };
  }
  return { label: "지도 위치", primary: group.placeName || group.address || "표시 완료", secondary: group.address || group.reviewReason || "" };
}

function renderCardAction(group, row, tab) {
  if (!group || !["mapped", "manual", "needs_review", "failed"].includes(group.status)) return "";
  const placeKey = escapeHtml(row.placeKey || group.key);
  if (group.status === "failed") {
    return `<button type="button" class="mini-action strong" data-edit-place-key="${placeKey}">다시 검색</button>`;
  }
  if (group.status === "needs_review") {
    return `<button type="button" class="mini-action strong warn-action" data-edit-place-key="${placeKey}">위치 확인하기</button>`;
  }
  if (group.status === "manual") {
    return `<button type="button" class="mini-action ghost" data-edit-place-key="${placeKey}">다시 수정</button>`;
  }
  return `<button type="button" class="mini-action ghost" data-edit-place-key="${placeKey}">위치 수정</button>`;
}

function truncateText(value, maxLength = 40) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
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

function getRowToneClass(group, tab, row = null) {
  if (group?.status === "needs_review") return "row-review";
  if (group?.status === "failed") return "row-failed";
  if (group?.status === "manual") return "row-manual";
  if (tab === "excluded" || row?.excludeReason) return "row-muted";
  return "";
}

function getStatusLabelFromGroup(group) {
  if (!group) return "지도 대상";
  if (group.status === "manual") return "수동 확인 완료";
  if (group.status === "needs_review") return "확인 필요";
  if (group.status === "failed") return "검색 실패";
  return "표시 완료";
}

function getRowStatus(row, tab) {
  if (row.excludeReason && (tab === "excluded" || tab === "all" || state.mode === "mapped")) return row.excludeReason;

  const group = getGroupForRow(row);
  if (state.mode === "mapped") {
    if (group?.status === "failed") return group.reviewReason || "장소 검색 결과가 없습니다.";
    if (group) return getStatusLabelFromGroup(group);
    return row.excludeReason || "지도 대상";
  }

  if (tab === "target") return "지도 대상";
  if (tab === "excluded") return row.excludeReason;
  return row.excludeReason || "지도 대상";
}

function renderStatusBadge(text, tab, canJump = false, placeKey = "", row = null) {
  const group = state.groupedPlaces.find((item) => item.key === placeKey);

  if (group && ["mapped", "manual", "needs_review", "failed"].includes(group.status)) {
    const statusClass = group.status === "manual" ? "manual" : group.status === "needs_review" ? "warn" : group.status === "failed" ? "danger" : "";
    const label = getStatusLabelFromGroup(group);
    const title = group.reviewReason || group.address || label;

    if (group.status === "failed") {
      return `<div class="status-stack"><span class="badge danger">검색 실패</span><small>${escapeHtml(title || "검색 결과 없음")}</small><button type="button" class="mini-action" data-edit-place-key="${escapeHtml(placeKey || group.key)}">위치 수정</button></div>`;
    }

    const action = group.status === "needs_review"
      ? `<button type="button" class="mini-action" data-edit-place-key="${escapeHtml(placeKey)}">위치 수정</button>`
      : `<button type="button" class="mini-action ghost" data-edit-place-key="${escapeHtml(placeKey)}">다른 위치 찾기</button>`;
    return `<div class="status-stack"><span class="badge ${statusClass}" title="${escapeHtml(title)}">${label}</span><small>${escapeHtml(group.placeName || group.address || title)}</small>${action}</div>`;
  }

  let className = "";
  if (tab === "excluded" || row?.excludeReason) className = "gray";
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
  const editButton = event.target.closest("[data-edit-place-key]");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openLocationEditor(editButton.dataset.editPlaceKey);
    return;
  }

  const target = event.target.closest("[data-place-key]");
  if (!target) return;
  const placeKey = target.dataset.placeKey;
  focusPlaceOnMap(placeKey);
}

function focusPlaceOnMap(placeKey) {
  const group = state.groupedPlaces.find((item) => item.key === placeKey && ["mapped", "manual", "needs_review"].includes(item.status));
  if (!group || !state.map || !group.marker) return;

  state.infowindows.forEach((item) => item.close());
  const position = group.marker.getPosition();
  state.map.panTo(position);
  if (state.map.getLevel() > 4) state.map.setLevel(4);
  group.infowindow?.open(state.map, group.marker);

  elements.tableWrap.querySelectorAll(".row-focus, .card-focus").forEach((row) => row.classList.remove("row-focus", "card-focus"));
  elements.tableWrap.querySelectorAll(`[data-place-key="${CSS.escape(placeKey)}"]`).forEach((row) => row.classList.add(row.classList.contains("place-card") ? "card-focus" : "row-focus"));
  setStatus(`${group.place} 위치로 이동했습니다.`);
}

function formatWon(value) {
  return `${Number(value || 0).toLocaleString("ko-KR")}원`;
}

function setStatus(message, isError = false) {
  const isBusy = isBusyStatusMessage(message, isError);
  elements.statusText.textContent = stripStaticDots(message);
  elements.statusText.style.color = isError ? "#c2410c" : "#687386";
  setLoadingDots(elements.statusText, isBusy);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openLocationEditor(placeKey) {
  const group = state.groupedPlaces.find((item) => item.key === placeKey);
  if (!group || !elements.locationModal) return;
  state.manualEditPlaceKey = placeKey;
  state.manualSearchCandidates = [];
  const areaHint = getEffectiveAreaHint();
  const defaultQuery = normalizeSearchQuery([areaHint, group.place].filter(Boolean).join(" "));
  elements.locationModalTitle.textContent = `${group.place} 위치 확인`;
  elements.locationSearchInput.value = defaultQuery;
  elements.locationCandidateList.innerHTML = `<p class="candidate-empty">검색어를 확인한 뒤 [다시 검색]을 눌러 후보를 선택하세요.</p>`;
  elements.locationModal.classList.remove("hidden");
  elements.locationSearchInput.focus();
}

function closeLocationEditor() {
  if (!elements.locationModal) return;
  elements.locationModal.classList.add("hidden");
  state.manualEditPlaceKey = "";
  state.manualSearchCandidates = [];
}

function handleLocationModalClick(event) {
  if (event.target === elements.locationModal) {
    closeLocationEditor();
    return;
  }
  const closeButton = event.target.closest("[data-close-location-modal]");
  if (closeButton) {
    closeLocationEditor();
    return;
  }
  const useButton = event.target.closest("[data-use-candidate-index]");
  if (useButton) {
    const index = Number(useButton.dataset.useCandidateIndex);
    applyManualCandidate(index);
  }
}

async function searchManualLocationCandidates() {
  const group = state.groupedPlaces.find((item) => item.key === state.manualEditPlaceKey);
  if (!group || !elements.locationCandidateList) return;
  const query = elements.locationSearchInput.value.trim();
  if (!query) {
    elements.locationCandidateList.innerHTML = `<p class="candidate-empty warn">검색어를 입력해 주세요.</p>`;
    return;
  }

  try {
    elements.locationCandidateList.innerHTML = `<p class="candidate-empty">장소를 다시 검색하는 중입니다...</p>`;
    await loadKakaoMap(getEffectiveKakaoKey());
    const places = new kakao.maps.services.Places();
    const docs = await keywordSearch(places, query);
    if (!docs.length) {
      state.manualSearchCandidates = [];
      elements.locationCandidateList.innerHTML = `<p class="candidate-empty warn">장소 검색 결과가 없습니다. 검색어를 조금 더 구체적으로 입력해 주세요.</p>`;
      return;
    }
    state.manualSearchCandidates = docs
      .map((doc) => calculatePlaceConfidence(group.place, doc, getEffectiveAreaHint(), query, docs.length))
      .sort((a, b) => b.confidenceScore - a.confidenceScore)
      .slice(0, 8);
    renderManualCandidateList();
  } catch (error) {
    console.error(error);
    elements.locationCandidateList.innerHTML = `<p class="candidate-empty warn">카카오 지도 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>`;
  }
}

function renderManualCandidateList() {
  if (!elements.locationCandidateList) return;
  if (!state.manualSearchCandidates.length) {
    elements.locationCandidateList.innerHTML = `<p class="candidate-empty warn">선택할 후보가 없습니다.</p>`;
    return;
  }
  elements.locationCandidateList.innerHTML = state.manualSearchCandidates.map((item, index) => {
    const address = item.road_address_name || item.address_name || "주소 정보 없음";
    return `<article class="candidate-card">
      <div>
        <strong>${escapeHtml(item.place_name || "이름 없음")}</strong>
        <span>${escapeHtml(address)}</span>
        <em>${escapeHtml(item.reviewReason || "")}</em>
      </div>
      <button type="button" class="primary-button mini-use" data-use-candidate-index="${index}">이 위치 사용</button>
    </article>`;
  }).join("");
}

function applyManualCandidate(index) {
  const group = state.groupedPlaces.find((item) => item.key === state.manualEditPlaceKey);
  const candidate = state.manualSearchCandidates[index];
  if (!group || !candidate) return;
  group.lat = Number(candidate.y);
  group.lng = Number(candidate.x);
  group.address = candidate.road_address_name || candidate.address_name || "";
  group.placeName = candidate.place_name || "";
  group.searchQuery = elements.locationSearchInput.value.trim();
  group.candidateCount = state.manualSearchCandidates.length;
  group.confidenceScore = candidate.confidenceScore ?? 0;
  group.reviewReason = "사용자가 후보 목록에서 직접 선택했습니다.";
  group.status = "manual";
  redrawMarkersFromGroups();
  state.pendingRows = collectPendingRowsFromGroups();
  state.mode = "mapped";
  state.currentTab = "mapped";
  renderTabs();
  renderSummary();
  renderTable();
  updateNextAction("mapped");
  focusPlaceOnMap(group.key);
  closeLocationEditor();
  setStatus(`${group.place} 위치를 수동 확인 완료로 반영했습니다.`);
}

function collectPendingRowsFromGroups() {
  const rows = [];
  state.groupedPlaces.forEach((group) => {
    if (!["needs_review", "failed"].includes(group.status)) return;
    group.rows.forEach((row) => rows.push({ ...row, locationStatus: group.reviewReason || "위치 확인 필요" }));
  });
  return rows;
}

function redrawMarkersFromGroups() {
  state.markers.forEach((marker) => marker.setMap(null));
  state.infowindows.forEach((infowindow) => infowindow.close());
  state.markers = [];
  state.infowindows = [];
  state.bounds = new kakao.maps.LatLngBounds();
  state.groupedPlaces.forEach((group) => {
    group.marker = null;
    group.infowindow = null;
    if (["mapped", "manual", "needs_review"].includes(group.status) && Number.isFinite(group.lat) && Number.isFinite(group.lng)) {
      createMarker(group);
    }
  });
  fitMapToMarkers();
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
    applyPlaceSearchResult(group, result);
  }

  fitMapToMarkers();
}

function applyPlaceSearchResult(group, result) {
  if (!result) {
    group.status = "failed";
    group.lat = null;
    group.lng = null;
    group.address = "";
    group.placeName = "";
    group.searchQuery = "";
    group.candidateCount = 0;
    group.confidenceScore = 0;
    group.reviewReason = `검색 결과 없음 · ${getEffectiveAreaHint()} 기준`;
    pushRowsToPending(group, group.reviewReason);
    return;
  }

  group.lat = Number(result.y);
  group.lng = Number(result.x);
  group.address = result.road_address_name || result.address_name || "";
  group.placeName = result.place_name || "";
  group.searchQuery = result.searchQuery || "";
  group.candidateCount = result.candidateCount || 1;
  group.confidenceScore = result.confidenceScore ?? 0;
  group.reviewReason = result.reviewReason || "학교 기준 지역과 장소명이 일치합니다.";
  group.status = result.status || "needs_review";

  if (Number.isFinite(group.lat) && Number.isFinite(group.lng)) createMarker(group);
  if (["needs_review", "failed"].includes(group.status)) pushRowsToPending(group, group.reviewReason);
}

function pushRowsToPending(group, message) {
  for (const row of group.rows) {
    state.pendingRows.push({ ...row, locationStatus: message });
  }
}

async function searchPlaceForGroup(places, group) {
  const areaHint = getEffectiveAreaHint();
  const broadHint = getBroadAreaHint(areaHint);
  const exactNames = makeBranchFirstSearchNames(group.place);
  const placeQueries = makePlaceSearchNames(group.place);
  const coreNames = makeCorePlaceNames(group.place);
  const queries = [];
  const pushQuery = (...parts) => {
    const query = normalizeSearchQuery(parts.filter(Boolean).join(" "));
    if (query && !queries.includes(query)) queries.push(query);
  };

  // v1.2.4: 지점명이 포함된 사용처는 학교 자치구보다 상호+지점명을 먼저 믿습니다.
  // 학교 카드 사용처는 학교 근처가 아닐 수도 있으므로, 자치구는 보조 힌트로만 사용합니다.
  exactNames.forEach((name) => pushQuery(name));
  exactNames.forEach((name) => pushQuery(broadHint, name));
  exactNames.forEach((name) => pushQuery(areaHint, name));
  placeQueries.forEach((name) => pushQuery(areaHint, name));
  placeQueries.forEach((name) => pushQuery(broadHint, name));
  coreNames.forEach((name) => pushQuery(areaHint, name));
  coreNames.forEach((name) => pushQuery(broadHint, name));
  placeQueries.forEach((name) => pushQuery(name));
  coreNames.forEach((name) => pushQuery(name));

  return tryQueries(places, queries, areaHint, group.place);
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
  return state.schoolRegionHint || DEFAULT_REGION_HINT;
}

function normalizeSchoolNameKey(value) {
  return String(value || "")
    .replace(/학교$/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function getSchoolRegionFallback(schoolName) {
  const compact = String(schoolName || "").replace(/\s+/g, "");
  if (!compact) return "";
  return SCHOOL_REGION_FALLBACKS[compact] || SCHOOL_REGION_FALLBACKS[`${compact}학교`] || "";
}

async function resolveSchoolRegionHint({ force = false } = {}) {
  const userHint = normalizeAreaHint(elements.areaHint?.value?.trim() || "");
  if (userHint) {
    state.schoolRegionHint = userHint;
    state.schoolRegionSource = "manual";
    state.schoolRegionSchool = elements.schoolName?.value?.trim() || "";
    updateMapSettingStatus();
    updateSchoolStatus(`${userHint} 기준으로 검색합니다.`, "ready");
    return userHint;
  }

  const schoolName = elements.schoolName?.value?.trim() || "";
  if (!schoolName) {
    state.schoolRegionHint = "";
    state.schoolRegionSource = "default";
    state.schoolRegionSchool = "";
    updateMapSettingStatus();
    updateSchoolStatus();
    return DEFAULT_REGION_HINT;
  }

  const schoolKey = normalizeSchoolNameKey(schoolName);
  if (!force && state.schoolRegionHint && normalizeSchoolNameKey(state.schoolRegionSchool) === schoolKey) {
    return state.schoolRegionHint;
  }
  if (!force) {
    updateSchoolStatus("학교 주소 확인 전 · 사용처 지도 만들기를 누르면 주소에서 자치구를 확인합니다.", "neutral");
    return state.schoolRegionHint || DEFAULT_REGION_HINT;
  }

  const requestKey = schoolKey;
  try {
    updateSchoolStatus(`${schoolName} 학교 주소 확인 중...`, "loading");
    const schoolInfo = await findSchoolRegionWithSchoolInfoApi(schoolName);
    if (normalizeSchoolNameKey(elements.schoolName?.value?.trim() || "") !== requestKey) {
      return state.schoolRegionHint || DEFAULT_REGION_HINT;
    }
    if (schoolInfo?.regionHint) {
      state.schoolRegionHint = schoolInfo.regionHint;
      state.schoolRegionSource = "neis";
      state.schoolRegionSchool = schoolInfo.schoolName || schoolName;
      updateMapSettingStatus();
      const addressText = schoolInfo.address ? ` · ${schoolInfo.address}` : "";
      updateSchoolStatus(`${schoolInfo.schoolName || schoolName} · ${schoolInfo.regionHint} 주소 확인 완료${addressText}`, "ready");
      return schoolInfo.regionHint;
    }
  } catch (error) {
    console.warn("학교 주소 API 확인 실패", error);
  }

  try {
    updateSchoolStatus(`${schoolName} 학교 위치를 지도에서 보조 확인 중...`, "loading");
    const key = getEffectiveKakaoKey();
    if (!key) throw new Error("지도 키가 없습니다.");
    await loadKakaoMap(key);
    const kakaoHint = await findSchoolRegionWithKakao(schoolName);
    if (normalizeSchoolNameKey(elements.schoolName?.value?.trim() || "") !== requestKey) {
      return state.schoolRegionHint || DEFAULT_REGION_HINT;
    }
    if (kakaoHint) {
      state.schoolRegionHint = kakaoHint;
      state.schoolRegionSource = "kakao";
      state.schoolRegionSchool = schoolName;
      updateMapSettingStatus();
      updateSchoolStatus(`${kakaoHint} 학교 위치로 보조 확인했습니다.`, "ready");
      return kakaoHint;
    }
  } catch (error) {
    console.warn("카카오 학교 위치 보조 확인 실패", error);
  }

  const fallbackHint = getSchoolRegionFallback(schoolName);
  if (fallbackHint) {
    state.schoolRegionHint = fallbackHint;
    state.schoolRegionSource = "fallback";
    state.schoolRegionSchool = schoolName;
    updateMapSettingStatus();
    updateSchoolStatus(`${fallbackHint} 보조값으로 검색합니다. 학교 주소 확인 결과가 아니므로 필요 시 고급 설정에서 수정하세요.`, "neutral");
    return fallbackHint;
  }

  state.schoolRegionHint = DEFAULT_REGION_HINT;
  state.schoolRegionSource = "default";
  state.schoolRegionSchool = schoolName;
  updateMapSettingStatus();
  updateSchoolStatus(`학교 주소를 확인하지 못했습니다. ${DEFAULT_REGION_HINT} 기준으로 넓게 검색합니다. 필요하면 지도 고급 설정에서 지역 보조어를 입력하세요.`, "neutral");
  return DEFAULT_REGION_HINT;
}

async function findSchoolRegionWithSchoolInfoApi(schoolName) {
  const params = new URLSearchParams({ schoolName });
  const response = await fetch(`${SCHOOL_INFO_ENDPOINT}?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null);
  if (!data?.ok || !data.regionHint) return null;
  return data;
}

function makeSchoolSearchCandidates(schoolName) {
  const compact = String(schoolName || "").replace(/\s+/g, "").trim();
  const candidates = [compact];
  const add = (value) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };

  const suffixAliases = [
    ["여고", "여자고등학교", "여자고"],
    ["남고", "남자고등학교", "남자고"],
    ["여중", "여자중학교", "여자중"],
    ["남중", "남자중학교", "남자중"],
    ["여자고", "여자고등학교", "여자고"],
    ["남자고", "남자고등학교", "남자고"],
    ["여자중", "여자중학교", "여자중"],
    ["남자중", "남자중학교", "남자중"],
  ];
  suffixAliases.forEach(([shortSuffix, fullSuffix, middleSuffix]) => {
    if (compact.endsWith(shortSuffix)) {
      const stem = compact.slice(0, -shortSuffix.length);
      add(`${stem}${fullSuffix}`);
      add(`${stem}${middleSuffix}`);
      add(`${compact}학교`);
      if (shortSuffix.endsWith("고")) add(`${compact}등학교`);
    }
  });

  if (/중$/.test(compact)) add(`${compact}학교`);
  if (/고$/.test(compact)) {
    add(`${compact}등학교`);
    add(`${compact}학교`);
  }
  if (/초$/.test(compact)) {
    add(`${compact}등학교`);
    add(`${compact}학교`);
  }
  if (!/학교$/.test(compact)) add(`${compact}학교`);
  if (/학교$/.test(compact)) add(compact.replace(/학교$/, ""));
  return uniqueValues(candidates);
}

async function findSchoolRegionWithKakao(schoolName) {
  if (!window.kakao?.maps?.services) return "";
  const places = new kakao.maps.services.Places();
  const candidates = makeSchoolSearchCandidates(schoolName);
  const queries = uniqueValues(candidates.flatMap((name) => [`서울특별시 ${name}`, `${name} 서울`, name]));
  for (const query of queries) {
    const docs = await keywordSearch(places, query);
    const region = extractSeoulRegionFromSchoolPlaces(docs, candidates);
    if (region) return region;
  }
  return "";
}

function normalizeKoreanPlaceName(value) {
  return String(value || "").replace(/[\s()\[\]{}·.,-]/g, "").trim();
}

function extractSeoulRegionFromSchoolPlaces(docs, schoolCandidates = []) {
  const normalizedCandidates = schoolCandidates.map(normalizeKoreanPlaceName).filter(Boolean);
  const schoolDocs = (docs || []).filter((item) => {
    const placeName = normalizeKoreanPlaceName(item.place_name || "");
    const category = `${item.category_group_name || ""} ${item.category_name || ""}`;
    const looksLikeSchool = /학교|교육|학문/.test(category) || /학교$/.test(placeName);
    const nameMatches = normalizedCandidates.some((candidate) => placeName.includes(candidate) || candidate.includes(placeName));
    return looksLikeSchool && nameMatches;
  });

  for (const item of schoolDocs) {
    const address = `${item.road_address_name || ""} ${item.address_name || ""}`;
    if (!address.includes("서울")) continue;
    const match = address.match(/서울(?:특별시)?\s*([가-힣]+구)/);
    if (match) return `서울특별시 ${match[1]}`;
  }
  return "";
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
  // v1.2.5: 카드 승인내역에는 운영사명, 법인명, 슬래시 지역 힌트가 섞여 들어오는 경우가 많습니다.
  // 검색 후보를 여러 갈래로 만들어 카카오 장소검색이 실제 상호를 더 잘 찾게 합니다.
  const original = cleanCell(place);
  const variants = [];
  const push = (value) => {
    const cleaned = normalizeSearchQuery(String(value || "")
      .replace(/[&·]/g, " ")
      .replace(/[()]/g, " "));
    if (cleaned && !variants.includes(cleaned)) variants.push(cleaned);
  };

  const sources = uniqueValues([
    original,
    ...extractCorporateTailCandidates(original),
    stripCorporateWords(original),
    original.replace(/[()]/g, " "),
  ]);

  sources.forEach((source) => {
    push(source);
    if (/파리바게[트드]/.test(source)) push(source.replace(/파리바게트|파리바게드/g, "파리바게뜨"));
    if (/파리바게뜨/.test(source)) {
      push(source.replace(/파리바게뜨/g, "파리바게트"));
      push(source.replace(/파리바게뜨/g, "파리바게드"));
    }
    makeSlashAwareSearchVariants(source).forEach(push);
    makeBranchSuffixVariants(source).forEach(push);
  });

  // 법인명 뒤에 붙은 실제 상호는 가장 중요한 후보라 뒤에 한 번 더 넣습니다.
  extractCorporateTailCandidates(original).forEach((tail) => {
    push(tail);
    makeBranchSuffixVariants(tail).forEach(push);
  });

  return uniqueValues(variants);
}

function makeBranchFirstSearchNames(place) {
  const original = cleanCell(place);
  const names = [];
  const push = (value) => {
    const cleaned = normalizeSearchQuery(String(value || "")
      .replace(/[&·]/g, " ")
      .replace(/[()]/g, " "));
    if (cleaned && !names.includes(cleaned)) names.push(cleaned);
  };

  makePlaceSearchNames(original).forEach(push);

  const parenTokens = Array.from(original.matchAll(/\(([^)]{2,})\)/g)).map((match) => match[1].trim()).filter(Boolean);
  const baseWithoutParen = original.replace(/\(.*?\)/g, " ").replace(/\s+/g, " ").trim();
  parenTokens.forEach((token) => push(`${baseWithoutParen} ${token}`));

  return uniqueValues(names);
}

function stripCorporateWords(value) {
  return normalizeSearchQuery(String(value || "")
    .replace(/주식회사|유한회사|농업회사법인|재단법인|사단법인|학교법인|사회적협동조합/g, " ")
    .replace(/\(주\)|㈜|주\)/g, " ")
    .replace(/[&·]/g, " ")
    .replace(/[()]/g, " "));
}

function extractCorporateTailCandidates(value) {
  const text = cleanCell(value);
  const candidates = [];
  const add = (candidate) => {
    const cleaned = stripCorporateWords(candidate);
    if (cleaned && cleaned.length >= 2 && !candidates.includes(cleaned)) candidates.push(cleaned);
  };

  [
    /\(주\)\s*([^()]{2,})$/,
    /㈜\s*([^()]{2,})$/,
    /주식회사\s*([^()]{2,})$/,
    /유한회사\s*([^()]{2,})$/,
    /농업회사법인\s*([^()]{2,})$/,
    /재단법인\s*([^()]{2,})$/,
    /사단법인\s*([^()]{2,})$/,
  ].forEach((pattern) => {
    const match = text.match(pattern);
    if (match?.[1]) add(match[1]);
  });

  // 예: 더이룸푸드(주)정담은보쌈 → 정담은보쌈
  const inlineCorp = text.match(/(?:\(주\)|㈜|주식회사|유한회사|농업회사법인|재단법인|사단법인)\s*([가-힣A-Za-z0-9][^()]{1,})$/);
  if (inlineCorp?.[1]) add(inlineCorp[1]);

  return candidates;
}

function makeSlashAwareSearchVariants(value) {
  const text = normalizeSearchQuery(value);
  if (!/[\/|]/.test(text)) return [];
  const parts = text.split(/[\/|]/).map((part) => normalizeSearchQuery(part)).filter(Boolean);
  if (!parts.length) return [];
  const variants = [];
  const add = (item) => {
    const cleaned = normalizeSearchQuery(item);
    if (cleaned && !variants.includes(cleaned)) variants.push(cleaned);
  };
  const base = parts[0];
  add(base);
  makeBranchSuffixVariants(base).forEach(add);
  parts.slice(1).forEach((token) => {
    add(`${base} ${token}`);
    makeBranchSuffixVariants(base).forEach((baseVariant) => add(`${baseVariant} ${token}`));
  });
  return variants;
}

function makeBranchSuffixVariants(value) {
  const text = normalizeSearchQuery(value);
  const variants = [];
  const add = (item) => {
    const cleaned = normalizeSearchQuery(item);
    if (cleaned && cleaned !== text && !variants.includes(cleaned)) variants.push(cleaned);
  };
  add(text.replace(/직영점/g, "점"));
  add(text.replace(/직영점|본점|지점|분점|대리점/g, "점"));
  add(text.replace(/직영점|본점|지점|분점|대리점/g, ""));
  add(text.replace(/([가-힣A-Za-z0-9]+)점\b/g, "$1"));
  return variants;
}

async function tryQueries(places, queries, areaHint = "", originalName = "") {
  let best = null;
  let totalCandidates = 0;
  const seen = new Set();

  for (const query of queries) {
    const docs = await keywordSearch(places, query);
    totalCandidates += docs.length;
    for (const doc of docs) {
      const dedupeKey = `${doc.id || ""}|${doc.place_name || ""}|${doc.x || ""}|${doc.y || ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const evaluated = calculatePlaceConfidence(originalName, doc, areaHint, query, docs.length);
      if (!best || evaluated.confidenceScore > best.confidenceScore) best = evaluated;
    }
    // v1.2.7: 여러 지점이 있는 상호는 처음 나온 후보만 믿지 않습니다.
    // 이름만으로 높은 점수가 나와도, 뒤쪽 쿼리에서 학교/검색어 자치구와 더 잘 맞는 후보가 나올 수 있으므로
    // 모든 검색 후보를 비교한 뒤 가장 좋은 후보를 고릅니다.
    // 단, 상호+지점+지역이 모두 강하게 일치하는 사실상 확정 후보는 조기 종료합니다.
    if (best?.confidenceScore >= 98 && best?.status === "mapped") break;
  }

  if (!best) return null;
  best.candidateCount = totalCandidates || best.candidateCount || 1;
  return best;
}

function calculatePlaceConfidence(originalName, item, areaHint = "", query = "", queryCandidateCount = 1) {
  const address = `${item.road_address_name || ""} ${item.address_name || ""}`.trim();
  const schoolDistrict = extractDistrict(areaHint);
  const queryDistrict = extractDistrict(query);
  const district = queryDistrict || schoolDistrict;
  const originalNorm = normalizeComparablePlaceName(originalName);
  const placeNorm = normalizeComparablePlaceName(item.place_name || "");
  const originalTokens = makeNameTokens(originalName);
  const placeTokens = makeNameTokens(item.place_name || "");
  const hasBranchInfo = hasExplicitBranchInfo(originalName);
  const branchMatched = hasBranchTokenMatch(originalName, item.place_name || "");
  const mainStoreMatched = hasMainStoreNameMatch(originalName, item.place_name || "");
  const coreStoreMatched = hasStoreCoreNameMatch(originalName, item.place_name || "");
  const addressHintMatched = hasAddressHintMatch(originalName, address);
  const strongBranchMatch = hasBranchInfo && branchMatched && (mainStoreMatched || coreStoreMatched);
  const isSeoulResult = address.includes("서울");
  let score = 0;
  const reasons = [];

  if (isSeoulResult) {
    score += 22;
    reasons.push("서울특별시 결과");
  } else if (address) {
    score -= 55;
    reasons.push("서울 외 지역 결과");
  }

  if (queryDistrict && address.includes(queryDistrict)) {
    score += 42;
    reasons.push("검색어 자치구와 일치");
  } else if (schoolDistrict && address.includes(schoolDistrict)) {
    score += 30;
    reasons.push("학교 기준 자치구와 일치");
  } else if ((queryDistrict || schoolDistrict) && isSeoulResult) {
    // v1.2.7: 지점명이 명확하면 다른 구도 허용하되,
    // 지점명이 없는 다지점 상호는 검색어/학교 자치구 후보를 더 위로 올립니다.
    const penalty = strongBranchMatch ? 0 : hasBranchInfo && branchMatched ? -2 : -10;
    score += penalty;
    reasons.push(strongBranchMatch ? "상호와 지점명이 일치해 다른 자치구도 허용" : hasBranchInfo && branchMatched ? "지점명이 일치해 다른 자치구도 허용" : "서울 지역이나 자치구 불일치");
  }

  let nameScore = 0;
  if (originalNorm && placeNorm) {
    if (placeNorm === originalNorm) {
      nameScore = 40;
      reasons.push("장소명 완전 일치");
    } else if (placeNorm.includes(originalNorm) || originalNorm.includes(placeNorm)) {
      nameScore = 34;
      reasons.push("장소명 대부분 일치");
    } else {
      const overlap = countTokenOverlap(originalTokens, placeTokens);
      if (overlap >= 2) {
        nameScore = 26;
        reasons.push("장소명 핵심 단어 일부 일치");
      } else if (overlap === 1) {
        nameScore = coreStoreMatched ? 30 : 13;
        reasons.push(coreStoreMatched ? "법인명 제외 상호 일치" : "장소명 일부만 일치");
      } else {
        nameScore = strongBranchMatch || coreStoreMatched ? 18 : -38;
        reasons.push(strongBranchMatch || coreStoreMatched ? "정제한 상호명 기준으로 보정" : "장소명 유사도 낮음");
      }
    }
  }
  score += nameScore;

  if (strongBranchMatch) {
    score += 38;
    reasons.push("상호와 지점명 일치");
  } else if (coreStoreMatched) {
    score += 26;
    reasons.push("법인명/운영사명 제외 상호 일치");
  } else if (hasBranchInfo && branchMatched) {
    score += 24;
    reasons.push("지점명 일치");
  } else if (hasBranchInfo) {
    score -= 14;
    reasons.push("지점명 확인 필요");
  }

  if (addressHintMatched) {
    score += 12;
    reasons.push("사용처명 지역 힌트와 주소 일치");
  }

  if (isCommonStoreName(originalName) && !hasBranchInfo && !(district && address.includes(district))) {
    // v1.2.6: 프랜차이즈라도 서울 안의 후보가 잡히면 우선 지도에 표시합니다.
    // 지점이 애매하면 사용자가 나중에 위치 수정으로 고칠 수 있게 하고, 자동 표시를 더 우선합니다.
    score -= 4;
    reasons.push("흔한 상호명이나 서울 결과를 우선 표시");
  }

  if (item.category_group_code === "FD6") score += 6;
  if (item.category_name?.includes("음식점")) score += 5;
  if (item.road_address_name) score += 3;
  if (queryCandidateCount >= 5 && score < 52 && !branchMatched) {
    score -= 3;
    reasons.push("후보가 여러 개 있어 참고 필요");
  }
  if (originalNorm.length <= 2) {
    score -= 8;
    reasons.push("상호명이 짧아 참고 필요");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  // v1.2.6: 실사용 우선. 서울 안에서 상호 핵심어 또는 지점명이 맞으면 일단 지도에 표시합니다.
  // 학교 자치구는 힌트일 뿐이며, 다른 구에서 식사한 경우도 정상 사용처로 봅니다.
  const nameLooksUsable = nameScore >= 26 || mainStoreMatched || coreStoreMatched || branchMatched || strongBranchMatch;
  const queryDistrictMatch = queryDistrict && address.includes(queryDistrict);
  const schoolDistrictMatch = schoolDistrict && address.includes(schoolDistrict);
  const districtMatch = queryDistrictMatch || schoolDistrictMatch;
  if (strongBranchMatch && isSeoulResult) score = Math.max(score, 92);
  if (coreStoreMatched && isSeoulResult) score = Math.max(score, queryDistrictMatch || schoolDistrictMatch ? 88 : 82);
  if (branchMatched && isSeoulResult) score = Math.max(score, queryDistrictMatch || schoolDistrictMatch ? 86 : 78);
  if (nameScore >= 30 && isSeoulResult) score = Math.max(score, queryDistrictMatch ? 88 : schoolDistrictMatch ? 84 : 74);
  if (districtMatch && nameLooksUsable) score = Math.max(score, queryDistrictMatch ? 86 : 78);

  const autoMapped = isSeoulResult && (
    strongBranchMatch ||
    coreStoreMatched ||
    branchMatched ||
    nameScore >= 30 ||
    (districtMatch && nameScore >= 13) ||
    (queryCandidateCount <= 3 && nameScore >= 13)
  );
  const mappedThreshold = isSeoulResult ? 50 : 70;
  const status = autoMapped || (isSeoulResult && score >= mappedThreshold) ? "mapped" : "needs_review";
  const reviewReason = makeReviewReason(status, reasons, item, areaHint, score);
  return {
    ...item,
    searchQuery: query,
    confidenceScore: score,
    status,
    reviewReason,
    candidateCount: queryCandidateCount,
  };
}

function makeReviewReason(status, reasons, item, areaHint, score) {
  if (status === "mapped") return reasons.slice(0, 2).join(" · ") || "학교 기준 지역과 장소명이 일치합니다.";
  const address = item.road_address_name || item.address_name || "";
  const main = reasons.length ? reasons.join(" · ") : "검색 결과를 확신하기 어렵습니다.";
  return `${main} · ${score}점 · ${address || areaHint}`;
}

function extractDistrict(value) {
  const match = String(value || "").match(/([가-힣]+구)/);
  return match ? match[1] : "";
}

function normalizeComparablePlaceName(value) {
  return String(value || "")
    .replace(/파리바게트|파리바게드/g, "파리바게뜨")
    .replace(/주식회사|유한회사|농업회사법인|재단법인|사단법인/g, "")
    .replace(/\(주\)|㈜|주\)/g, "")
    .replace(/코리아|대한민국/g, "")
    .replace(/본점|분점|지점|직영점|대리점/g, "")
    .replace(/[0-9]+호점/g, "")
    .replace(/[\s()\[\]{}·.,_\-\/&+]/g, "")
    .trim()
    .toLowerCase();
}

function makeNameTokens(value) {
  const normalized = String(value || "")
    .replace(/주식회사|유한회사|\(주\)|㈜/g, " ")
    .replace(/[()\[\]{}·.,_\-\/&+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return normalized.split(" ").map((token) => token.trim()).filter((token) => token.length >= 2);
}

function countTokenOverlap(aTokens, bTokens) {
  const b = new Set(bTokens);
  return aTokens.filter((token) => b.has(token) || [...b].some((other) => other.includes(token) || token.includes(other))).length;
}

function getBranchTokens(value) {
  const text = String(value || "")
    .replace(/주식회사|유한회사|농업회사법인|재단법인|사단법인|학교법인|사회적협동조합/g, " ")
    .replace(/\(주\)|㈜|주\)/g, " ")
    .replace(/[\[\]{}·.,_\-&+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const tokens = [];
  const add = (token) => {
    const cleaned = String(token || "")
      .replace(/[^가-힣A-Za-z0-9]/g, "")
      .trim()
      .toLowerCase();
    const branchCore = normalizeBranchToken(cleaned);
    [cleaned, branchCore].forEach((candidate) => {
      if (candidate.length >= 2 && !tokens.includes(candidate)) tokens.push(candidate);
    });
  };

  Array.from(text.matchAll(/\(([^)]{2,})\)/g)).forEach((match) => add(match[1]));
  Array.from(text.matchAll(/([가-힣A-Za-z0-9]+(?:직영점|점|본점|지점|호점|몰점|역점))/g)).forEach((match) => add(match[1]));

  const splitTokens = text.replace(/[()\/|]/g, " ").split(" ").map((token) => token.trim()).filter(Boolean);
  if (splitTokens.length >= 2) {
    splitTokens.slice(1).forEach((token) => {
      if (/직영점|점|본점|지점|호점|역점|몰점|동|가|로|길|역|구|읍|면|리|타워|몰|센터$/.test(token) || token.length >= 3) {
        add(token);
      }
    });
  }
  return tokens;
}

function normalizeBranchToken(value) {
  return String(value || "")
    .replace(/직영점|본점|지점|분점|대리점|호점|몰점|역점/g, "")
    .replace(/점$/g, "")
    .trim()
    .toLowerCase();
}

function getAddressHintTokens(value) {
  const text = String(value || "");
  const tokens = [];
  const add = (token) => {
    const cleaned = normalizeBranchToken(String(token || "").replace(/[^가-힣A-Za-z0-9]/g, ""));
    if (cleaned.length >= 2 && !tokens.includes(cleaned)) tokens.push(cleaned);
  };
  text.split(/[\/|]/).slice(1).forEach(add);
  Array.from(text.matchAll(/([가-힣A-Za-z0-9]+(?:로|길|동|가|구|역))/g)).forEach((match) => add(match[1]));
  return tokens;
}

function hasAddressHintMatch(originalName, address) {
  const normalizedAddress = normalizeComparablePlaceName(address);
  return getAddressHintTokens(originalName).some((token) => normalizedAddress.includes(normalizeComparablePlaceName(token)));
}

function getStoreCoreCandidates(value) {
  const original = cleanCell(value);
  const candidates = [];
  const add = (candidate) => {
    const cleaned = stripCorporateWords(candidate);
    if (cleaned && normalizeComparablePlaceName(cleaned).length >= 2 && !candidates.includes(cleaned)) candidates.push(cleaned);
  };
  extractCorporateTailCandidates(original).forEach(add);
  makeSlashAwareSearchVariants(stripCorporateWords(original)).forEach(add);
  const noSlash = stripCorporateWords(original).split(/[\/|]/)[0];
  add(noSlash);
  return candidates;
}

function hasStoreCoreNameMatch(originalName, placeName) {
  const placeNorm = normalizeComparablePlaceName(placeName);
  return getStoreCoreCandidates(originalName).some((candidate) => {
    const candidateNorm = normalizeComparablePlaceName(candidate);
    return candidateNorm.length >= 2 && (placeNorm.includes(candidateNorm) || candidateNorm.includes(placeNorm));
  });
}

function hasExplicitBranchInfo(originalName) {
  return getBranchTokens(originalName).length > 0;
}

function hasBranchTokenMatch(originalName, placeName) {
  const original = getBranchTokens(originalName);
  if (!original.length) return false;
  const target = normalizeComparablePlaceName(placeName);
  return original.some((token) => {
    const compact = token.replace(/점$/g, "");
    return target.includes(token) || (compact.length >= 2 && target.includes(compact));
  });
}

function removeBranchTokensFromComparable(value, branchTokens = []) {
  let text = normalizeComparablePlaceName(value);
  branchTokens.forEach((token) => {
    const normalizedToken = normalizeComparablePlaceName(token);
    const compactToken = normalizedToken.replace(/점$/g, "");
    if (normalizedToken.length >= 2) text = text.replaceAll(normalizedToken, "");
    if (compactToken.length >= 2) text = text.replaceAll(compactToken, "");
  });
  return text.trim();
}

function hasMainStoreNameMatch(originalName, placeName) {
  const branchTokens = getBranchTokens(originalName);
  if (!branchTokens.length) return false;

  const originalMain = removeBranchTokensFromComparable(originalName, branchTokens);
  const placeMain = removeBranchTokensFromComparable(placeName, branchTokens);
  if (!originalMain || !placeMain) return false;

  if (originalMain.length >= 2 && placeMain.includes(originalMain)) return true;
  if (placeMain.length >= 2 && originalMain.includes(placeMain)) return true;

  const originalPieces = makeNameTokens(originalMain).filter((token) => token.length >= 2);
  const placePieces = makeNameTokens(placeMain).filter((token) => token.length >= 2);
  return countTokenOverlap(originalPieces, placePieces) > 0;
}

function isCommonStoreName(value) {
  const normalized = normalizeComparablePlaceName(value);
  const commonNames = [
    "본죽", "김밥천국", "스타벅스", "투썸플레이스", "이디야", "메가커피", "컴포즈커피",
    "파리바게뜨", "뚜레쥬르", "서브웨이", "맥도날드", "버거킹", "롯데리아", "맘스터치",
    "배스킨라빈스", "던킨", "파파존스", "피자헛", "도미노피자", "교촌치킨", "bhc", "bbq"
  ];
  return commonNames.some((name) => normalized.includes(normalizeComparablePlaceName(name)));
}

function makeCorePlaceNames(place) {
  const spaced = makePlaceSearchNames(place).join(" ");
  const tokens = makeNameTokens(spaced).filter((token) => !/서울|특별시|광역시|구$|점$/.test(token));
  const candidates = [];
  if (tokens.length) candidates.push(tokens[0]);
  if (tokens.length >= 2) candidates.push(`${tokens[0]} ${tokens[1]}`);
  return uniqueValues(candidates);
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
  const statusLabel = group.status === "manual" ? "수동 확인 완료" : group.status === "needs_review" ? "확인 필요" : "표시 완료";
  const content = `<div class="info-window">
    <button type="button" class="info-close" data-place-key="${escapeHtml(group.key)}" aria-label="정보창 닫기">×</button>
    <strong>${escapeHtml(group.place)}</strong>
    <div>${escapeHtml(statusLabel)} · ${group.rows.length}건 · ${formatWon(group.amount)}</div>
    <div>${escapeHtml(group.placeName || "")}</div>
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
