import { SQLocal } from 'sqlocal';
import { RunQuery, SqlExecutor, WorkhorseConfig } from '@/types.ts';
import { schema } from './sql.ts';
import { createQueryRunnerSqlocal } from './runQuery.ts';

async function createSchema(sql: SqlExecutor): Promise<void> {
  await sql(schema);
}

const createDatabase = async (config: WorkhorseConfig): Promise<RunQuery> => {
  const dbPath = config.dbPath ?? 'workhorse.sqlite3';
  const { deleteDatabaseFile } = new SQLocal(dbPath);
  await deleteDatabaseFile();
  // stored in the origin private file system
  const { sql } = new SQLocal(dbPath);
  await createSchema(sql);
  return createQueryRunnerSqlocal(sql);
};

export { createDatabase, schema };
