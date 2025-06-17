// import 'dotenv/config';
import { drizzle } from 'drizzle-orm/bun-sql';
// import { TransactionalAdapterDrizzleOrm } from '@nestjs-cls/transactional-adapter-drizzle-orm';

export const db = drizzle(process.env.DATABASE_URL!);

export type DrizzleClient = typeof db;

// export type DrizzleAdapter = TransactionalAdapterDrizzleOrm<DrizzleClient>;
