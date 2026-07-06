const SHEET_ID = '143Sx6U4qlHvA29a3QmnWuwgo-xXqkLgd';
const SHEET_GID = '1349414445';
const SHEET_RANGE = 'A1:C100';

const scheduleFallback = [
  { start: '2026-06-09', end: '2026-06-15', title: '기말고사' },
  { start: '2026-06-16', end: '2026-06-22', title: '보강기간' },
  { start: '2026-06-22', end: '2026-07-03', title: '재입학 신청기간' },
  { start: '2026-06-23', end: '2026-07-06', title: '하계 계절학기' },
  { start: '2026-06-23', end: '2026-08-31', title: '미등록 휴학기간' },
  { start: '2026-06-23', end: '2026-06-23', title: '하계방학' },
  { start: '2026-06-25', end: '2026-06-30', title: '성적공시 및 정정' },
  { start: '2026-06-29', end: '2026-07-10', title: 'AI역량교육' },
  { start: '2026-07-13', end: '2026-08-31', title: '휴학연기 신청기간' },
  { start: '2026-07-13', end: '2026-07-17', title: '복학기간' },
  { start: '2026-07-29', end: '2026-07-31', title: '예비수강 신청기간' },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const formatter = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});
const fullFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'long',
});

function parseDate(value) {
  const [year, month, date] = String(value).split('-').map(Number);
  return new Date(year, month - 1, date);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

function getStatus(item, today) {
  if (today < item.startDate) return 'upcoming';
  if (today > item.endDate) return 'completed';
  return 'active';
}

function statusLabel(status) {
  return {
    active: '진행중',
    upcoming: '예정',
    completed: '완료',
  }[status];
}

function formatRange(item) {
  if (item.start === item.end) {
    return formatter.format(item.startDate);
  }

  return `${formatter.format(item.startDate)} - ${formatter.format(item.endDate)}`;
}

function durationDays(item) {
  return daysBetween(item.startDate, item.endDate) + 1;
}

function normalizeScheduleRow(row) {
  const start = row.c?.[0]?.v;
  const end = row.c?.[1]?.v;
  const title = row.c?.[2]?.v;

  if (!start || !end || !title) {
    return null;
  }

  return {
    start: String(start),
    end: String(end),
    title: String(title).trim(),
  };
}

function fetchSchedulesFromSheet() {
  return new Promise((resolve, reject) => {
    const callbackName = `sheetCallback_${Date.now()}`;
    const script = document.createElement('script');

    window[callbackName] = (response) => {
      delete window[callbackName];
      script.remove();

      if (!response?.table?.rows?.length) {
        reject(new Error('스프레드시트에 일정 데이터가 없습니다.'));
        return;
      }

      const schedules = response.table.rows
        .map(normalizeScheduleRow)
        .filter(Boolean);

      if (!schedules.length) {
        reject(new Error('유효한 일정 데이터를 찾지 못했습니다.'));
        return;
      }

      resolve(schedules);
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error('스프레드시트를 불러오지 못했습니다.'));
    };

    const params = new URLSearchParams({
      tqx: `out:json;responseHandler:${callbackName}`,
      headers: '1',
      gid: SHEET_GID,
      range: SHEET_RANGE,
    });

    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params}`;
    document.body.appendChild(script);
  });
}

function makeItems(schedules, today) {
  return schedules
    .map((item) => {
      const startDate = parseDate(item.start);
      const endDate = parseDate(item.end);
      const enriched = { ...item, startDate, endDate };
      const status = getStatus(enriched, today);
      const dDay = status === 'upcoming'
        ? daysBetween(today, startDate)
        : daysBetween(today, endDate);

      return {
        ...enriched,
        status,
        dDay,
        duration: durationDays(enriched),
      };
    })
    .sort((a, b) => a.startDate - b.startDate || a.endDate - b.endDate);
}

function renderSummary(items) {
  const summary = [
    ['전체 일정', `${items.length}건`],
    ['진행 중', `${items.filter((item) => item.status === 'active').length}건`],
    ['다가오는 일정', `${items.filter((item) => item.status === 'upcoming').length}건`],
    ['가장 긴 일정', `${Math.max(...items.map((item) => item.duration))}일`],
  ];

  document.getElementById('summaryGrid').innerHTML = summary
    .map(([label, value]) => `
      <article class="metric-card">
        <span>${label}</span>
        <strong>${value}</strong>
      </article>
    `)
    .join('');
}

function renderToday(items, today, syncMessage) {
  const activeItems = items.filter((item) => item.status === 'active');
  document.getElementById('todayLabel').textContent = fullFormatter.format(today);
  document.getElementById('todaySummary').textContent = syncMessage || (
    activeItems.length
      ? `${activeItems.length}개 일정이 진행 중입니다.`
      : '오늘 진행 중인 일정은 없습니다.'
  );
}

function renderActive(items) {
  const activeItems = items.filter((item) => item.status === 'active');
  const target = document.getElementById('activeList');

  if (!activeItems.length) {
    target.innerHTML = '<p class="date-range">현재 진행 중인 일정은 없습니다. 아래 타임라인에서 예정 일정을 확인하세요.</p>';
    return;
  }

  target.innerHTML = activeItems
    .map((item) => {
      const remainText = item.dDay === 0 ? '오늘 종료' : `${item.dDay}일 남음`;
      return `
        <article class="active-item">
          <div>
            <h3>${item.title}</h3>
            <p class="date-range">${formatRange(item)} · ${durationDays(item)}일간</p>
          </div>
          <span class="status-pill active">${remainText}</span>
        </article>
      `;
    })
    .join('');
}

function renderUpcoming(items) {
  const upcomingItems = items
    .filter((item) => item.status === 'upcoming')
    .slice(0, 3);

  document.getElementById('upcomingList').innerHTML = upcomingItems
    .map((item) => `
      <li>
        <div>
          <strong>${item.title}</strong>
          <p class="date-range">${formatRange(item)} · D-${item.dDay}</p>
        </div>
      </li>
    `)
    .join('');
}

function renderMonthFlow(items) {
  const julyItems = items.filter((item) => item.startDate.getMonth() <= 6 && item.endDate.getMonth() >= 6);
  const longest = Math.max(...julyItems.map((item) => item.duration));

  document.getElementById('monthFlow').innerHTML = julyItems
    .map((item) => {
      const width = Math.max(18, Math.round((item.duration / longest) * 100));
      return `
        <article class="flow-item">
          <div class="flow-date">${formatRange(item)}</div>
          <div class="flow-track">
            <div class="flow-bar" style="width: ${width}%"></div>
            <div class="flow-label">${item.title}</div>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderTimeline(items, filter = 'all') {
  const target = document.getElementById('timeline');
  const filtered = filter === 'all' ? items : items.filter((item) => item.status === filter);

  target.innerHTML = filtered
    .map((item) => {
      const statusText = item.status === 'upcoming'
        ? `D-${item.dDay}`
        : item.status === 'active' && item.dDay === 0
          ? '오늘 종료'
          : statusLabel(item.status);

      return `
        <article class="timeline-item">
          <div class="timeline-date">${formatRange(item)}</div>
          <div class="timeline-title">
            <strong>${item.title}</strong>
            <span>${durationDays(item)}일간 · ${statusLabel(item.status)}</span>
          </div>
          <span class="status-pill ${item.status}">${statusText}</span>
        </article>
      `;
    })
    .join('');
}

function bindFilters(items) {
  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter-button').forEach((item) => item.classList.remove('is-active'));
      button.classList.add('is-active');
      renderTimeline(items, button.dataset.filter);
    });
  });
}

function renderDashboard(schedules, syncMessage) {
  const today = startOfDay(new Date());
  const items = makeItems(schedules, today);

  renderToday(items, today, syncMessage);
  renderSummary(items);
  renderActive(items);
  renderUpcoming(items);
  renderMonthFlow(items);
  renderTimeline(items);
  bindFilters(items);
}

async function initDashboard() {
  try {
    const schedules = await fetchSchedulesFromSheet();
    renderDashboard(
      schedules,
      `${schedules.length}개 일정을 스프레드시트에서 불러왔습니다.`
    );
  } catch (error) {
    renderDashboard(
      scheduleFallback,
      `스프레드시트 연결에 실패해 저장된 일정을 표시합니다. (${error.message})`
    );
  }
}

initDashboard();
