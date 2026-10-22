import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller.js';
import { ContactService } from './contact.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MailModule } from '../mail/mail.module.js';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
