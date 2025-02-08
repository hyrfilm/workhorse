import { SQLocal } from 'sqlocal';
import { RunQuery, SqlExecutor, WorkhorseConfig } from '@/types.ts';
import { schema } from './sql.ts';
import { createQueryRunnerSqlocal } from './runQuery.ts';

async function createSchema(sql: SqlExecutor): Promise<void> {
    await sql(schema);
};

//TODO: This just one big dummy implementation
const createDatabase = async (_config: WorkhorseConfig): Promise<RunQuery> => {
    const { deleteDatabaseFile } = new SQLocal('database.sqlite3');
    await deleteDatabaseFile();
    // stored in the origin private file system
    const { sql } = new SQLocal('database.sqlite3');
    await createSchema(sql);
    return createQueryRunnerSqlocal(sql);
};

export { createDatabase, schema };
