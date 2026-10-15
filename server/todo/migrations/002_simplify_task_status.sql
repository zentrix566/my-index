-- 任务状态精简（2026-10）：
-- 移除「进行中 in_progress / 已延期 deferred / 等待中 waiting」，新增「已挂起 suspended」。
-- 服务启动时 db.js 的 STATUS_NORMALIZATION_SQL 会幂等执行同样的订正，
-- 本文件仅作为生产库人工执行的归档，可重复运行。

UPDATE todos SET status = 'suspended' WHERE status = 'deferred';
UPDATE todos SET status = 'pending' WHERE status IN ('in_progress', 'waiting');
