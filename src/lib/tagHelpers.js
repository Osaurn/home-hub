function getTagsForTask(db, taskId) {
  return db
    .prepare(
      `SELECT t.id, t.name FROM tags t
       JOIN task_tags tt ON tt.tag_id = t.id
       WHERE tt.task_id = ?
       ORDER BY t.name COLLATE NOCASE`
    )
    .all(taskId);
}

function syncTaskTags(db, taskId, tagIds) {
  db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
  const insert = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)');
  const ids = Array.isArray(tagIds) ? tagIds : [];
  for (const tagId of ids) {
    if (Number.isInteger(tagId)) insert.run(taskId, tagId);
  }
}

module.exports = { getTagsForTask, syncTaskTags };
