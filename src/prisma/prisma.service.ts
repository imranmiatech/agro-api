import 'dotenv/config';

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  private readonly pool: pg.Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is not configured!');
    }

    const pool = new pg.Pool({
      connectionString,

      // Connection pool
      max: 5,
      min: 0,

      // Connection timeout
      connectionTimeoutMillis: 30000,

      // Idle connection management
      idleTimeoutMillis: 30000,

      // Keep TCP connection alive
      keepAlive: true,
    });

    pool.on('error', (error) => {
      this.logger.error(
        'Unexpected PostgreSQL pool error',
        error.stack,
      );
    });

    const adapter = new PrismaPg(pool);

    super({
      adapter,
    });

    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();

      await this.$queryRaw`SELECT 1`;

      this.logger.log('PostgreSQL connected successfully');
    } catch (error) {
      this.logger.error(
        'Database connection failed',
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool.end();

      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error(
        'Database shutdown error',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
