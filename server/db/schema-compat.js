/**
 * 生成旧账号外键清理 SQL。
 *
 * 认证库拆分后，各业务库只保存主账号 uid，不能继续引用本库旧 users 表。
 * 表名只接受代码内的固定安全标识，并限制在明确的业务表白名单内。
 */
export function buildDropLegacyUserForeignKeysSql(tableNames) {
  const safeNames = [...new Set(tableNames)]
  if (!safeNames.length || safeNames.some((name) => !/^[a-z][a-z0-9_]*$/.test(name))) {
    throw new Error('旧账号外键清理表名配置错误')
  }
  const tableList = safeNames.map((name) => `'${name}'`).join(', ')
  return `
DO $$
DECLARE legacy_foreign_key RECORD;
BEGIN
  FOR legacy_foreign_key IN
    SELECT source_namespace.nspname AS schema_name,
           source_table.relname AS table_name,
           constraint_def.conname AS constraint_name
    FROM pg_constraint AS constraint_def
    JOIN pg_class AS source_table ON source_table.oid = constraint_def.conrelid
    JOIN pg_namespace AS source_namespace ON source_namespace.oid = source_table.relnamespace
    JOIN pg_class AS referenced_table ON referenced_table.oid = constraint_def.confrelid
    JOIN pg_namespace AS referenced_namespace ON referenced_namespace.oid = referenced_table.relnamespace
    WHERE constraint_def.contype = 'f'
      AND source_namespace.nspname = current_schema()
      AND source_table.relname IN (${tableList})
      AND referenced_table.relname = 'users'
      AND referenced_namespace.nspname = current_schema()
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      legacy_foreign_key.schema_name,
      legacy_foreign_key.table_name,
      legacy_foreign_key.constraint_name
    );
  END LOOP;
END $$;
`
}
