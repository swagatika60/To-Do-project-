const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !Number.isNaN(Date.parse(str));
}

router.get('/', authRequired, (req, res) => {
  const date = req.query.date || todayISO();
  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD' });
  }

  const row = db
    .prepare(
      'SELECT todos_json, updated_at FROM daily_tasks WHERE user_id = ? AND task_date = ?'
    )
    .get(req.user.id, date);

  let todos = [];
  if (row) {
    try {
      todos = JSON.parse(row.todos_json);
      if (!Array.isArray(todos)) todos = [];
    } catch {
      todos = [];
    }
  }

  res.json({ date, todos, updatedAt: row?.updated_at || null });
});

router.put('/', authRequired, (req, res) => {
  const date = req.query.date || req.body.date || todayISO();
  const { todos } = req.body;

  if (!isValidDate(date)) {
    return res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD' });
  }
  if (!Array.isArray(todos)) {
    return res.status(400).json({ error: 'todos must be an array' });
  }

  const json = JSON.stringify(todos);
  db.prepare(
    `INSERT INTO daily_tasks (user_id, task_date, todos_json, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, task_date) DO UPDATE SET
       todos_json = excluded.todos_json,
       updated_at = datetime('now')`
  ).run(req.user.id, date, json);

  const row = db
    .prepare(
      'SELECT updated_at FROM daily_tasks WHERE user_id = ? AND task_date = ?'
    )
    .get(req.user.id, date);

  res.json({ date, todos, updatedAt: row.updated_at });
});

router.get('/dates', authRequired, (req, res) => {
  const rows = db
    .prepare(
      `SELECT task_date, updated_at, todos_json
       FROM daily_tasks WHERE user_id = ?
       ORDER BY task_date DESC LIMIT 60`
    )
    .all(req.user.id);

  res.json({
    dates: rows.map((r) => {
      let taskCount = 0;
      try {
        const list = JSON.parse(r.todos_json);
        if (Array.isArray(list)) taskCount = list.length;
      } catch {
        /* ignore */
      }
      return { date: r.task_date, updatedAt: r.updated_at, taskCount };
    }),
  });
});

module.exports = router;
