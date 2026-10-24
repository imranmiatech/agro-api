import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pool: pg.Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('❌ DATABASE_URL is not set in environment!');
    }
    const pool = new pg.Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database successfully');
      this.logger.log('http://localhost:3000/api/docs');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      await this.pool?.end();
    } catch {}
  }
}
