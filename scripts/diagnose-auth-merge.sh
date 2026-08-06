#!/usr/bin/env bash
#
# 只读诊断：探查 zentrix 与 zentrix_willpower 两个库的用户表及业务表 user_id 引用
# 目的：判断合并进 zentrix_auth 时是否需要去重、id 如何重映射。
# 仅执行 SELECT / 导出，不修改任何数据。可反复运行，安全。
#
# 用法（Docker 环境）：
#   docker run --rm -v "$PWD/scripts:/scripts" -e PG_PASS='生产PG密码' postgres:16 \
#     bash /scripts/diagnose-auth-merge.sh
#
set -euo pipefail

PG_HOST="${PG_HOST:-39.106.136.18}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_PASS="${PG_PASS:-}"
MAIN_DB="${MAIN_DB:-zentrix}"
WP_DB="${WP_DB:-zentrix_willpower}"

if [ -z "$PG_PASS" ]; then
  echo "ERROR: 请先 export PG_PASS='生产PG密码'" >&2
  exit 1
fi
export PGPASSWORD="$PG_PASS"
PSQL="psql -v ON_ERROR_STOP=1 -h $PG_HOST -p $PG_PORT -U $PG_USER -t -A"

ORPHAN_SQL='DO $$
DECLARE r RECORD; n BIGINT;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name='\''user_id'\'' AND table_schema='\''public'\''
  LOOP
    EXECUTE format(
      '\''SELECT count(*) FROM %I t WHERE t.user_id IS NOT NULL '\''
      '\''AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = t.user_id)'\'',
      r.table_name) INTO n;
    RAISE NOTICE '\''% : rows_with_orphan_user_id=%'\'', r.table_name, n;
  END LOOP;
END $$;'

echo "############################################"
echo "# 主库 $MAIN_DB"
echo "############################################"
echo "--- users 行数 / id 范围 ---"
$PSQL -d "$MAIN_DB" -c "SELECT 'users', count(*), min(id), max(id) FROM users;"
echo "--- 含 user_id 的业务表及其孤儿 user_id 数（应为 0）---"
$PSQL -d "$MAIN_DB" -c "$ORPHAN_SQL" || true
echo "--- 是否含令牌表 ---"
$PSQL -d "$MAIN_DB" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('password_reset_tokens','email_verification_tokens');"

echo "############################################"
echo "# 心魔库 $WP_DB"
echo "############################################"
echo "--- users 行数 / id 范围 ---"
$PSQL -d "$WP_DB" -c "SELECT 'users', count(*), min(id), max(id) FROM users;"
echo "--- 含 user_id 的业务表及其孤儿 user_id 数（应为 0）---"
$PSQL -d "$WP_DB" -c "$ORPHAN_SQL" || true
echo "--- 是否含令牌表 ---"
$PSQL -d "$WP_DB" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('password_reset_tokens','email_verification_tokens');"

echo "############################################"
echo "# 两库用户去重分析（用户名 / 邮箱交集）"
echo "############################################"
$PSQL -d "$MAIN_DB" -c "SELECT lower(username) FROM users ORDER BY 1;" > /tmp/zx_u.txt
$PSQL -d "$WP_DB"   -c "SELECT lower(username) FROM users ORDER BY 1;" > /tmp/wp_u.txt
$PSQL -d "$MAIN_DB" -c "SELECT lower(email) FROM users WHERE email IS NOT NULL ORDER BY 1;" > /tmp/zx_e.txt 2>/dev/null || true
$PSQL -d "$WP_DB"   -c "SELECT lower(email) FROM users WHERE email IS NOT NULL ORDER BY 1;" > /tmp/wp_e.txt 2>/dev/null || true
echo "--- 仅存在于 zentrix_willpower、主库没有的用户名数 ---"
comm -23 /tmp/wp_u.txt /tmp/zx_u.txt | wc -l
echo "--- 两库都有的用户名（交集，合并时需去重）---"
comm -12 /tmp/zx_u.txt /tmp/wp_u.txt
echo "--- 仅存在于 zentrix_willpower、主库没有的邮箱数 ---"
comm -23 /tmp/wp_e.txt /tmp/zx_e.txt | wc -l
echo "--- 两库都有的邮箱（交集）---"
comm -12 /tmp/zx_e.txt /tmp/wp_e.txt
echo "--- 样例：zentrix_willpower 独有的前 20 个用户名 ---"
comm -23 /tmp/wp_u.txt /tmp/zx_u.txt | head -20

echo "############################################"
echo "# 诊断完成"
echo "############################################"
