-- 记录任务是否曾被挂起（2026-10）：
-- 「已挂起」代表用户主动搁置，这类任务完成后不应再按「晚于预期/延期完成」提示。
-- 标记一经置位不回滚（历史事实）；服务启动时 db.js 会幂等执行同样的升级，
-- 本文件仅作为生产库人工执行的归档，可重复运行。

ALTER TABLE todos ADD COLUMN IF NOT EXISTS was_suspended SMALLINT NOT NULL DEFAULT 0;
