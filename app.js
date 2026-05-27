const addForm = document.querySelector('.add');
const list = document.querySelector('.todos');
const search = document.querySelector('.search input');
const taskCount = document.querySelector('#task-count');
const clearCompletedBtn = document.querySelector('#clear-completed');

const STORAGE_KEY = 'todos-v1';

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

let todos = loadTodos();

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {
    /* ignore corrupt storage */
  }
  return [
    { id: uid(), text: 'play mariokart', done: false },
    { id: uid(), text: 'defeat ganon in zelda', done: false },
    { id: uid(), text: 'make a veggie pie', done: false },
  ];
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateTaskCount() {
  const active = todos.filter((t) => !t.done).length;
  taskCount.textContent =
    active === 0
      ? 'No active tasks'
      : `${active} active task${active === 1 ? '' : 's'}`;
  clearCompletedBtn.disabled = !todos.some((t) => t.done);
}

function render() {
  const term = search.value.trim().toLowerCase();
  list.innerHTML = todos
    .map((todo) => {
      const hidden =
        term && !todo.text.toLowerCase().includes(term) ? ' filtered' : '';
      return `<li class="list-group-item d-flex justify-content-between align-items-center${hidden}" data-id="${todo.id}">
        <label class="todo-label mb-0 d-flex align-items-center flex-grow-1">
          <input type="checkbox" class="toggle-done mr-2" ${todo.done ? 'checked' : ''} aria-label="Mark complete">
          <span class="${todo.done ? 'done' : ''}">${escapeHtml(todo.text)}</span>
        </label>
        <button type="button" class="delete-btn btn btn-link p-0 text-light" aria-label="Delete todo">&#128465;</button>
      </li>`;
    })
    .join('');
  updateTaskCount();
}

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = addForm.add.value.trim();
  if (!text) return;
  todos.push({ id: uid(), text, done: false });
  saveTodos();
  render();
  addForm.reset();
});

list.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.dataset.id;

  if (e.target.classList.contains('delete-btn')) {
    todos = todos.filter((t) => t.id !== id);
    saveTodos();
    render();
    return;
  }

  if (e.target.classList.contains('toggle-done')) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.done = e.target.checked;
      saveTodos();
      render();
    }
  }
});

clearCompletedBtn.addEventListener('click', () => {
  todos = todos.filter((t) => !t.done);
  saveTodos();
  render();
});

search.addEventListener('keyup', () => render());

render();
