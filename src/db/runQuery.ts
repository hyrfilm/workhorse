import { QueryResult, RunQuery, SqlExecutor } from "@/types";

const createQueryRunnerSqlocal = (sql: SqlExecutor): RunQuery => {
    const runQuery = async (query: string): Promise<QueryResult[]> => {
        return await sql(query);
    };
    return runQuery;
}

export { createQueryRunnerSqlocal };
