import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined. Set it in your environment variables.');
}

const createPool = () =>
  new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  });

const pool = globalThis.pgPool ?? createPool();

if (process.env.NODE_ENV !== 'production') {
  globalThis.pgPool = pool;
}

export const query = async <T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

export const withTransaction = async <T>(handler: (client: PoolClient) => Promise<T>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}
