import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            console.error('❌ DATABASE_URL is not set in environment!');
        }
        const pool = new pg.Pool({
            connectionString,
        });
        const adapter = new PrismaPg(pool);
        super({ adapter });
    }

    async onModuleInit() {
        try {
            await this.$connect();
            console.log('Connected to database');
            console.log("http://localhost:3000/docs")
        } catch (error) {
            console.log(error);
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
