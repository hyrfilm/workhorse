import { QueryResult, RunQuery, SqlExecutor } from '@/types.ts';

const createQueryRunnerSqlocal = (sql: SqlExecutor): RunQuery => {
  const runQuery = async (query: string, ...values: unknown[]): Promise<QueryResult[]> => {
    return await sql(query, ...values);
  };
  return runQuery;
};

export { createQueryRunnerSqlocal };
