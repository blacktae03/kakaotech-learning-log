// =========================================================
// 상태 변수
// =========================================================

let todos = [];               // 전체 Todo 배열
let currentFilter = 'all';   // 'all' | 'active' | 'completed'
let currentDate = getToday(); // 현재 선택된 날짜 (YYYY-MM-DD)
let editingId = null;         // 수정 중인 Todo의 id (없으면 null)

// =========================================================
// 날짜 유틸
// =========================================================

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (로컬 시간 기준)
function getToday() {
  const now = new Date();
  return toDateStr(now);
}

// YYYY-MM-DD 문자열을 "2026년 6월 3일 (화)" 형식으로 변환
function formatDate(dateStr) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  // 'T00:00:00' 없이 파싱하면 UTC 기준으로 처리되어 날짜가 하루 밀릴 수 있으므로 로컬 시간 기준으로 파싱
  const date = new Date(dateStr + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = days[date.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dayOfWeek})`;
}

// Date 객체를 YYYY-MM-DD 문자열로 변환 (로컬 시간 기준)
function toDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 날짜 문자열에 offset(일수)를 더한 새 날짜 문자열 반환
function addDays(dateStr, offset) {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + offset);
  return toDateStr(date);
}

// =========================================================
// localStorage 연동
// =========================================================

function saveToStorage() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

function loadFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('todos')) || [];
  } catch {
    // JSON 파싱 실패 시 빈 배열로 초기화
    return [];
  }
}

// =========================================================
// Todo CRUD
// =========================================================

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    showError('할 일을 입력해 주세요.');
    return;
  }
  todos.push({
    id: Date.now().toString(),
    text: trimmed,
    completed: false,
    date: currentDate, // 현재 선택된 날짜로 저장
  });
  saveToStorage();
  render();
}

function toggleTodo(id) {
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  saveToStorage();
  render();
}

function editTodo(id, newText) {
  const trimmed = newText.trim();
  if (!trimmed) {
    showError('내용을 입력해 주세요.');
    return;
  }
  todos = todos.map(todo =>
    todo.id === id ? { ...todo, text: trimmed } : todo
  );
  editingId = null;
  saveToStorage();
  render();
}

function deleteTodo(id) {
  todos = todos.filter(todo => todo.id !== id);
  saveToStorage();
  render();
}

// =========================================================
// 필터링
// =========================================================

// 현재 날짜 + 현재 필터를 기준으로 보여줄 Todo 목록 반환
function getFilteredTodos() {
  return todos
    .filter(todo => todo.date === currentDate)
    .filter(todo => {
      if (currentFilter === 'active') return !todo.completed;
      if (currentFilter === 'completed') return todo.completed;
      return true; // 'all'
    });
}

// =========================================================
// 에러 메시지
// =========================================================

function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  setTimeout(() => {
    el.textContent = '';
  }, 2000);
}

// =========================================================
// HTML 이스케이프 (XSS 방지)
// =========================================================

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================
// 렌더 — 상태가 바뀔 때마다 이 함수 하나로 전체 UI를 갱신
// =========================================================

function render() {
  // 1. 날짜 표시 갱신
  document.getElementById('currentDateDisplay').textContent = formatDate(currentDate);

  // 2. 필터 탭 활성 상태 갱신
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === currentFilter);
  });

  // 3. Todo 목록 갱신
  const list = document.getElementById('todoList');
  const filtered = getFilteredTodos();

  if (filtered.length === 0) {
    list.innerHTML = '<li class="empty-msg">할 일이 없어요 🎉</li>';
    return;
  }

  list.innerHTML = filtered
    .map(todo => {
      // 수정 중인 항목은 입력 폼으로 렌더
      if (todo.id === editingId) {
        return `
          <li class="todo-item editing" data-id="${todo.id}">
            <input
              type="text"
              class="edit-input"
              value="${escapeHtml(todo.text)}"
              data-id="${todo.id}"
            />
            <div class="todo-actions">
              <button class="save-btn" data-id="${todo.id}">저장</button>
              <button class="cancel-btn" data-id="${todo.id}">취소</button>
            </div>
          </li>`;
      }

      // 일반 Todo 항목 렌더
      return `
        <li class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
          <button class="check-btn" data-id="${todo.id}" title="완료 토글">
            ${todo.completed ? '✓' : ''}
          </button>
          <span class="todo-text">${escapeHtml(todo.text)}</span>
          <div class="todo-actions">
            <button class="edit-btn" data-id="${todo.id}">수정</button>
            <button class="delete-btn" data-id="${todo.id}">삭제</button>
          </div>
        </li>`;
    })
    .join('');

  // 수정 모드 진입 시 input에 포커스
  if (editingId) {
    const input = list.querySelector('.edit-input');
    if (input) {
      input.focus();
      input.select();
    }
  }
}

// =========================================================
// 이벤트 등록 및 앱 초기화
// =========================================================

function init() {
  // localStorage에서 데이터 복원 후 첫 렌더
  todos = loadFromStorage();
  render();

  // [추가 버튼] 클릭
  document.getElementById('addBtn').addEventListener('click', () => {
    const input = document.getElementById('todoInput');
    addTodo(input.value);
    input.value = '';
  });

  // [입력창] Enter 키로 추가
  document.getElementById('todoInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      addTodo(e.target.value);
      e.target.value = '';
    }
  });

  // [← 이전 날짜] 버튼
  document.getElementById('prevDate').addEventListener('click', () => {
    currentDate = addDays(currentDate, -1);
    editingId = null; // 날짜 이동 시 수정 모드 해제
    render();
  });

  // [→ 다음 날짜] 버튼
  document.getElementById('nextDate').addEventListener('click', () => {
    currentDate = addDays(currentDate, 1);
    editingId = null;
    render();
  });

  // [필터 탭] 클릭
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentFilter = tab.dataset.filter;
      editingId = null; // 필터 변경 시 수정 모드 해제
      render();
    });
  });

  // [Todo 목록] 이벤트 위임 — 클릭
  // 목록 자체에 이벤트를 하나만 등록하고, 클릭된 버튼에 따라 분기
  document.getElementById('todoList').addEventListener('click', e => {
    const id = e.target.dataset.id;
    if (!id) return;

    if (e.target.classList.contains('check-btn')) {
      toggleTodo(id);
    } else if (e.target.classList.contains('edit-btn')) {
      editingId = id;
      render();
    } else if (e.target.classList.contains('delete-btn')) {
      deleteTodo(id);
    } else if (e.target.classList.contains('save-btn')) {
      const input = document.querySelector(`.edit-input[data-id="${id}"]`);
      editTodo(id, input ? input.value : '');
    } else if (e.target.classList.contains('cancel-btn')) {
      editingId = null;
      render();
    }
  });

  // [Todo 목록] 수정 input에서 키보드 단축키
  document.getElementById('todoList').addEventListener('keydown', e => {
    if (!e.target.classList.contains('edit-input')) return;
    const id = e.target.dataset.id;

    if (e.key === 'Enter') {
      editTodo(id, e.target.value);
    } else if (e.key === 'Escape') {
      editingId = null;
      render();
    }
  });
}

// 앱 시작
init();
