import { SQLocal } from 'sqlocal';
import { RunQuery, SqlExecutor, WorkhorseConfig } from '@/types';
import { schema } from './sql';
import { createQueryRunnerSqlocal } from './runQuery';

async function createSchema(sql: SqlExecutor): Promise<void> {
    await sql(schema);
};

//TODO: This just one big dummy implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createDatabase = async (_config: WorkhorseConfig): Promise<RunQuery> => {
    const { deleteDatabaseFile } = new SQLocal('database.sqlite3');
    await deleteDatabaseFile();
    // stored in the origin private file system
    const { sql } = new SQLocal('database.sqlite3');
    await createSchema(sql);
    return createQueryRunnerSqlocal(sql);
};

export { createDatabase, schema };
