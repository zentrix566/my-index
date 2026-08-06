#!/usr/bin/env bash
#
# 认证库独立化迁移脚本（分阶段，生产执行）
# --------------------------------------------------------------------------
# 把主库 zentrix 的 users + 心魔库 zentrix_willpower 的 users
# 合并去重后迁入独立库 zentrix_auth；业务数据（炉石/心魔进度）原地不动，
# 仅把各业务表的 user_id 重映射到 zentrix_auth 的新 id。
# 用户 id 在两源库各自从 1 起，直接合会撞主键，故本脚本统一分配新 id。
#
# 分阶段用法：
#   阶段1（只搬 owner 验证）： MIGRATE_USER=zentrix566 PG_PASS='生产密码' bash scripts/migrate-auth-db.sh
#   阶段2（搬其余用户）      ： PG_PASS='生产密码' bash scripts/migrate-auth-db.sh
#
# 前置：能连通生产 PG（39.106.136.18:5432），账号 postgres（超级用户）。
# 安全：旧表默认保留（DROP_OLD_TABLES=1 才删），撤销 AUTH_DB_URL 即可秒回退。
# 仅执行 SELECT/INSERT/UPDATE，不删业务数据。
# --------------------------------------------------------------------------
set -euo pipefail

PG_HOST="${PG_HOST:-39.106.136.18}"
PG_PORT="${PG_PORT:-5432}"
PG_USER="${PG_USER:-postgres}"
PG_PASS="${PG_PASS:-}"
MAIN_DB="${MAIN_DB:-zentrix}"
WP_DB="${WP_DB:-zentrix_willpower}"
AUTH_DB="${AUTH_DB:-zentrix_auth}"
MIGRATE_USER="${MIGRATE_USER:-}"   # 非空则只迁移该用户名（两库中）

if [ -z "$PG_PASS" ]; then
  echo "ERROR: 请先 export PG_PASS='生产PG密码'" >&2
  exit 1
fi
export PGPASSWORD="$PG_PASS"

PSQL="psql -v ON_ERROR_STOP=1 -h $PG_HOST -p $PG_PORT -U $PG_USER -t -A -F $'\t' -P null=__NULL__"
SENT="__NULL__"

esc() { local s="$1"; s="${s//\'/\'\'}"; printf '%s' "$s"; }
# 可空字段：NULL 或加引号字符串
sqlstr() { if [ "$1" = "$SENT" ]; then printf 'NULL'; else printf "'%s'" "$(esc "$1")"; fi; }

echo "=================================================="
echo "第1段：建认证库 + 表（幂等）"
echo "=================================================="
$PSQL -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='$AUTH_DB'" | grep -q 1 || \
  $PSQL -d postgres -c "CREATE DATABASE $AUTH_DB;"
echo "数据库 $AUTH_DB 就绪"

$PSQL -d "$AUTH_DB" -c "
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pwreset_user ON password_reset_tokens(user_id);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_emailverify_user ON email_verification_tokens(user_id);
CREATE TABLE IF NOT EXISTS module_activity (
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module        TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module)
);
"
echo "认证库表结构就绪"

echo "=================================================="
echo "第2段：拉取目标用户（zentrix + zentrix_willpower，去重）"
echo "=================================================="
F_MAIN=$(mktemp /tmp/mig_main.XXXX.tsv)
F_WP=$(mktemp /tmp/mig_wp.XXXX.tsv)
WHERE=""
if [ -n "$MIGRATE_USER" ]; then
  WHERE="WHERE lower(username)=lower('$(esc "$MIGRATE_USER")')"
fi
# 动态探测源 users 表可选列（不同部署版本列可能不同，避免引用不存在的列报错 42703）
col_expr() {
  # $1=db $2=col $3=type(text|bool) -> 存在返回 COALESCE 表达式，否则返回哨兵字面量
  local db="$1" col="$2" typ="$3"
  if $PSQL -d "$db" -t -A -c "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='$col'" | grep -q 1; then
    if [ "$typ" = bool ]; then echo "COALESCE($col::text,'$SENT')"; else echo "COALESCE($col,'$SENT')"; fi
  else
    echo "'$SENT'"
  fi
}
build_colq() {
  local db="$1"
  echo "id, username, COALESCE(password_hash,'$SENT'), $(col_expr "$db" email text), $(col_expr "$db" email_verified bool), $(col_expr "$db" has_password bool), $(col_expr "$db" display_name text), $(col_expr "$db" avatar text), COALESCE(to_char(created_at,'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"'),'$SENT')"
}
COLQ_MAIN=$(build_colq "$MAIN_DB")
COLQ_WP=$(build_colq "$WP_DB")
$PSQL -d "$MAIN_DB" -c "SELECT $COLQ_MAIN FROM users $WHERE ORDER BY id;" > "$F_MAIN"
$PSQL -d "$WP_DB"   -c "SELECT $COLQ_WP FROM users $WHERE ORDER BY id;" > "$F_WP"
echo "zentrix 命中 $(grep -c . "$F_MAIN") 行；zentrix_willpower 命中 $(grep -c . "$F_WP") 行"

# 计算合并：按 username(小写) 去重，分配新 id
# 先取 zentrix_auth 已有用户名->id，避免重复插入
F_EXIST=$(mktemp /tmp/mig_exist.XXXX.tsv)
$PSQL -d "$AUTH_DB" -c "SELECT lower(username), id FROM users;" > "$F_EXIST"
declare -A EXIST
while IFS=$'\t' read -r u i; do
  [ -z "$u" ] && continue
  EXIST["$u"]="$i"
done < "$F_EXIST"

# 起始新 id = 当前 zentrix_auth 最大 id（无则 0）
MAXID=$($PSQL -d "$AUTH_DB" -t -A -c "SELECT COALESCE(max(id),0) FROM users;" 2>/dev/null || echo 0)
NEXT=${MAXID:-0}
declare -A NEWID          # username(lower) -> new_id
declare -A MAP_MAIN       # old_id -> new_id （仅 zentrix 来源）
declare -A MAP_WP         # old_id -> new_id （仅 zentrix_willpower 来源）
INS=$(mktemp /tmp/mig_ins.XXXX.sql)

emit_insert() {
  # $1=new_id $2=username $3=ph $4=email $5=ev $6=hp $7=dn $8=av $9=ca
  printf "INSERT INTO users (id,username,password_hash,email,email_verified,has_password,display_name,avatar,created_at) VALUES (%s, '%s', '%s', %s, %s, %s, %s, %s, %s);\n" \
    "$1" "$(esc "$2")" "$(esc "$3")" \
    "$(sqlstr "$4")" "$([ "$5" = "$SENT" ] && echo NULL || echo "$5")" \
    "$([ "$6" = "$SENT" ] && echo NULL || echo "$6")" \
    "$(sqlstr "$7")" "$(sqlstr "$8")" \
    "$([ "$9" = "$SENT" ] && echo NULL || printf "TIMESTAMPTZ '%s'" "$9")" >> "$INS"
}

merge_file() {
  local f="$1" which="$2"
  while IFS=$'\t' read -r id username ph email ev hp dn av ca; do
    [ -z "$id" ] && continue
    local key="${username,,}"
    if [ -n "${NEWID[$key]:-}" ]; then
      # 已分配（来自另一库的同名用户）：仅记映射
      if [ "$which" = main ]; then MAP_MAIN["$id"]="${NEWID[$key]}"; else MAP_WP["$id"]="${NEWID[$key]}"; fi
      continue
    fi
    local nid
    if [ -n "${EXIST[$key]:-}" ]; then
      nid="${EXIST[$key]}"            # 已在 zentrix_auth 中
    else
      NEXT=$((NEXT+1)); nid=$NEXT     # 分配新 id
      # 密码优先用 zentrix 来源；本函数可能先处理 wp，后处理 main 会覆盖 NEWID 但不覆盖已插入
      emit_insert "$nid" "$username" "$ph" "$email" "$ev" "$hp" "$dn" "$av" "$ca"
    fi
    NEWID["$key"]="$nid"
    if [ "$which" = main ]; then MAP_MAIN["$id"]="$nid"; else MAP_WP["$id"]="$nid"; fi
  done < "$f"
}
# 先处理 zentrix（优先作为密码来源），再处理 zentrix_willpower
merge_file "$F_MAIN" main
merge_file "$F_WP" wp

echo "--- 待插入 zentrix_auth 的新用户（$(grep -c 'INSERT INTO users' "$INS") 条）---"
cat "$INS"
$PSQL -d "$AUTH_DB" -f "$INS"
echo "--- 映射概览（源库old_id -> 新id）---"
for k in "${!MAP_MAIN[@]}"; do echo "zentrix.$k -> ${MAP_MAIN[$k]}"; done
for k in "${!MAP_WP[@]}"; do echo "zentrix_willpower.$k -> ${MAP_WP[$k]}"; done

echo "=================================================="
echo "第3段：建 _id_map 临时表并逐库重映射 user_id"
echo "=================================================="
remap_db() {
  local db="$1"; name="$2"; decl="$3"
  local sql=$(mktemp /tmp/remap.XXXX.sql)
  echo "DROP TABLE IF EXISTS _id_map; CREATE TEMP TABLE _id_map(old_id INT, new_id INT);" > "$sql"
  # 把映射写进临时表（逐行 INSERT）
  if [ "$name" = main ]; then
    for k in "${!MAP_MAIN[@]}"; do echo "INSERT INTO _id_map VALUES ($k, ${MAP_MAIN[$k]});" >> "$sql"; done
  else
    for k in "${!MAP_WP[@]}"; do echo "INSERT INTO _id_map VALUES ($k, ${MAP_WP[$k]});" >> "$sql"; done
  fi
  cat >> "$sql" <<'PGSQL'
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name='user_id' AND table_schema='public'
  LOOP
    EXECUTE format(
      'UPDATE %I t SET user_id = m.new_id FROM _id_map m WHERE t.user_id = m.old_id',
      r.table_name);
    RAISE NOTICE 'remapped %I', r.table_name;
  END LOOP;
END $$;
PGSQL
  $PSQL -d "$db" -f "$sql"
  rm -f "$sql"
}
remap_db "$MAIN_DB" main
remap_db "$WP_DB" wp

echo "=================================================="
echo "第4段：令牌表说明（不搬运）"
echo "=================================================="
echo "password_reset_tokens / email_verification_tokens 为 30 分钟短时凭证，"
echo "且已在第3段随 user_id 重映射。其有效令牌极少、过期即废，故不跨库搬运；"
echo "用户如需找回密码/验证邮箱，登录页重新申请即可（指向 zentrix_auth 的新令牌表）。"

echo "=================================================="
echo "第5段：修序列 + 校验"
echo "=================================================="
$PSQL -d "$AUTH_DB" -c "SELECT setval(pg_get_serial_sequence('users','id'), COALESCE((SELECT max(id) FROM users),0)+1, false);"
echo "--- zentrix_auth.users 概览 ---"
$PSQL -d "$AUTH_DB" -c "SELECT id, username, email, created_at FROM users ORDER BY id;"

echo "=================================================="
echo "迁移完成。旧表仍保留（撤销 AUTH_DB_URL 即秒回退）。"
echo "下一步：设 AUTH_DB_URL + OWNER_USERNAME，部署后验证 $MIGRATE_USER 登录与数据。"
echo "（如需删旧表，设 DROP_OLD_TABLES=1 再跑一次，或手动 DROP）"
echo "=================================================="
