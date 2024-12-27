import { SQLocal } from 'sqlocal';
import { SqlExecutor } from '@/types';
import { schema } from './sql';

async function createSchema(sql: SqlExecutor): Promise<void> {
    await sql(schema);
};

//TODO: This just one big dummy implementation
const createDatabase = async (): Promise<SqlExecutor> => {
    const { deleteDatabaseFile } = new SQLocal('database.sqlite3');
    await deleteDatabaseFile();
    // stored in the origin private file system
    const { sql } = new SQLocal('database.sqlite3');
    await createSchema(sql);
    return sql;
};

export { createDatabase, schema };