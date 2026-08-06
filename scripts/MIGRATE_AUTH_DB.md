# 认证库独立化：分阶段迁移 runbook（zentrix + zentrix_willpower → zentrix_auth）

目标：把账号体系（`users`）从业务主库 `zentrix` 与心魔库 `zentrix_willpower`
**合并去重**后迁入独立库 `zentrix_auth`；业务数据（炉石/心魔进度）原地不动，
仅把各业务表的 `user_id` 重映射到 `zentrix_auth` 的新 id。

> 生产 PG：`39.106.136.18:5432`，账号 `postgres`。本沙箱无 psql/生产网络，
> 建库搬数据须在生产主机（Docker 跑 `postgres:16`）执行，AI 不碰生产数据。

## 拓扑（代码确证）
- `zentrix`（`business-db.js` → `PG_DATABASE`）：炉石等业务表 + `users`
- `zentrix_willpower`（`willpower/db.js` → `WILLPOWER_PG_DATABASE`）：心魔业务表 + `users`
- `zentrix_auth`（`auth-db.js` → `AUTH_DB_URL`）：统一用户（目标）

两源库 `users` 各自从 id=1 起，直接合会撞主键 → 本方案统一分配新 id 并逐库重映射。

---

## 0. 全量备份（保险）
```bash
docker run --rm -v /tmp:/tmp -e PGPASSWORD='生产PG密码' postgres:16 \
  pg_dump -h 39.106.136.18 -p 5432 -U postgres -d zentrix -F c \
  -f /tmp/zentrix-full-$(date +%Y%m%d).dump
docker run --rm -v /tmp:/tmp -e PGPASSWORD='生产PG密码' postgres:16 \
  pg_dump -h 39.106.136.18 -p 5432 -U postgres -d zentrix_willpower -F c \
  -f /tmp/zentrix_willpower-full-$(date +%Y%m%d).dump
```

## 1. Phase 0：zentrix 库预处理（改名 owner + 删测试用户）
当前 `zentrix.users`：id=1 是 owner、id=2 是测试用户 `zentrix566`。
先删测试用户（清其业务数据），再把 owner 改名成 `zentrix566`，避免用户名冲突。
```bash
docker run --rm -e PGPASSWORD='生产PG密码' postgres:16 psql -h 39.106.136.18 -p 5432 -U postgres -d zentrix -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name='user_id' AND table_schema='public' AND table_name <> 'users'
  LOOP
    EXECUTE format('DELETE FROM %I WHERE user_id = 2', r.table_name);
  END LOOP;
END $$;
DELETE FROM users WHERE id = 2;
UPDATE users SET username = 'zentrix566' WHERE id = 1;
SQL
```
执行后确认：`SELECT id, username FROM users WHERE id IN (1,2);` → 仅 id=1 = zentrix566。

## 2. Phase 1：只迁 zentrix566（owner 验证用）
```bash
docker run --rm -v "$PWD/scripts:/scripts" -e PG_PASS='生产PG密码' \
  -e MIGRATE_USER=zentrix566 postgres:16 bash /scripts/migrate-auth-db.sh
```
脚本会：建 `zentrix_auth` + 表 → 合并 `zentrix` 与 `zentrix_willpower` 的 zentrix566 为 1 行（新 id=1，密码取 zentrix 来源）→ 在两库建 `_id_map` 并把各自业务表 `user_id=1` 重映射（此处新旧 id 同为 1，等价 no-op）→ 打印 `zentrix_auth.users` 概览。

## 3. 注入 AUTH_DB_URL + OWNER_USERNAME 并部署
`AUTH_DB_URL` 通过 Secret（`auth-db-url`）注入；`OWNER_USERNAME` 已在 `k8s/deployment.yaml`
改为 `zentrix566`（与改名配套，否则 owner 判定失效）。
```bash
# ① 给生产 Secret 加 auth-db-url（不重置其他 key）
kubectl patch secret zentrix-secrets -n default -p \
  "{\"stringData\":{\"auth-db-url\":\"postgres://postgres:真实密码@39.106.136.18:5432/zentrix_auth\"}}"
# ② 提交部署清单（deployment.yaml 已含 AUTH_DB_URL + OWNER_USERNAME=zentrix566）
git add -A && git commit -m "..." && git push   # 触发 CI 自动构建+重启
```
> 顺序要求：步骤 2（Phase 1）必须**先于**本步提交完成，保证新容器启动时 `zentrix_auth` 已有 zentrix566。

## 4. 验证 Phase 1
```bash
curl -fsS https://zentrix566.top/health
# owner(zentrix566) 登录后：
curl -fsS -b 'site_token=...' https://zentrix566.top/api/auth/admin/module-usage | head -c 500
# 浏览器：登录 zentrix566 → /admin 可见；各访问一次炉石与心魔，确认数据都在
```
确认无误后，再继续 Phase 2。

## 5. Phase 2：迁其余用户
```bash
docker run --rm -v "$PWD/scripts:/scripts" -e PG_PASS='生产PG密码' postgres:16 \
  bash /scripts/migrate-auth-db.sh
```
不加 `MIGRATE_USER` → 迁全部剩余用户，统一分配新 id（从 2 起），并把 `zentrix`
业务表 `user_id` 重映射到新 id（`zentrix_willpower` 仅 zentrix566，已处理，无变化）。
部署会随前述提交已生效；本步仅改数据，无需再提交（除非改了脚本）。

## 6. 最终验证
- `/admin` 能看到全部用户；炉石/心魔数据归属正确。
- 抽查几个非 owner 用户可正常登录、看到各自进度。

---

## 回滚（很稳）
- 旧 `users` 表在两源库**默认保留**，撤销 `AUTH_DB_URL`（删 secret 的 auth-db-url key 或回滚 deployment）
  → 重建重启即回退到用主库认证，零数据丢失。
- 已 DROP 旧表才需靠第 0 步全量备份恢复。

## 删旧表（稳定期后，默认不删）
保留一段时间（2~4 周）再删。两种方式二选一：
```bash
# 方式 A：脚本（须显式开开关）
DROP_OLD_TABLES=1 PG_PASS='生产PG密码' bash scripts/migrate-auth-db.sh
# 方式 B：手动（分别在 zentrix 与 zentrix_willpower 执行）
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;
```

## 不迁移的替代方案（路线 A）
若暂不做物理隔离，只部署新代码（含 `/admin` 与模块统计）重启即可：
不配 `AUTH_DB_URL` 时 `ensureAuthSchema()` 回退主库自动建 `module_activity`、补 `avatar` 列，
行为与拆库前一致，无需建库搬数据。
