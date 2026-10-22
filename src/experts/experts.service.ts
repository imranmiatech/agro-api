import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role, UserStatus } from '../generated/prisma/enums.js';
import { CreateExpertDto } from './dto/create-expert.dto.js';
import { UpdateExpertDto } from './dto/update-expert.dto.js';
import { QueryExpertDto } from './dto/query-expert.dto.js';
import { UpdateExpertStatusDto } from './dto/update-expert-status.dto.js';

export interface ExpertItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'EXPERT' | string;
  specialization: string;
  designation: string;
  experienceYears: string;
  bio: string;
  avatar: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isAvailableForSupport: boolean;
  assignedTicketsCount: number;
  rating: number;
  createdAt: string;
}

@Injectable()
export class ExpertsService {
  private readonly logger = new Logger(ExpertsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper function to map a database User record with ExpertProfile into ExpertItem format.
   * 100% dynamic - extracts directly from database record.
   */
  private mapUserToExpert(user: any): ExpertItem {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.expertProfile?.phone || '',
      role: user.role,
      specialization: user.expertProfile?.specialization || '',
      designation: user.expertProfile?.designation || '',
      experienceYears: user.expertProfile?.experienceYears || '',
      bio: user.expertProfile?.bio || '',
      avatar: user.avatar || '',
      status: user.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
      isAvailableForSupport: user.expertProfile?.isAvailableForSupport ?? false,
      assignedTicketsCount: user.expertProfile?.assignedTicketsCount ?? 0,
      rating: user.expertProfile?.rating ?? 0,
      createdAt:
        user.createdAt?.toISOString?.() || new Date(user.createdAt).toISOString(),
    };
  }

  /**
   * Create a new expert with credentials (email + password) directly in the database
   */
  async create(dto: CreateExpertDto): Promise<ExpertItem> {
    const email = dto.email.toLowerCase().trim();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }

    const plainPassword = dto.password?.trim() || 'Expert@123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        password: hashedPassword,
        avatar: dto.avatar?.trim() || null,
        role: Role.EXPERT,
        status: dto.status || UserStatus.ACTIVE,
        isEmailVerified: true,
        expertProfile: {
          create: {
            phone: dto.phone?.trim() || null,
            specialization: dto.specialization.trim(),
            designation: dto.designation?.trim() || '',
            experienceYears: dto.experienceYears ? String(dto.experienceYears) : '',
            bio: dto.bio?.trim() || null,
            isAvailableForSupport: true,
            assignedTicketsCount: 0,
            rating: 5.0,
          },
        },
      },
      include: {
        expertProfile: true,
      },
    });

    return this.mapUserToExpert(user);
  }

  /**
   * Find all experts with optional filtering and search directly from database
   */
  async findAll(query: QueryExpertDto) {
    const { search, specialization, status, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      role: Role.EXPERT,
    };

    if (status && status.toUpperCase() !== 'ALL') {
      where.status = status.toUpperCase() as UserStatus;
    }

    if (specialization && specialization.toLowerCase() !== 'all') {
      where.expertProfile = {
        specialization: {
          equals: specialization,
          mode: 'insensitive',
        },
      };
    }

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
        {
          expertProfile: {
            phone: { contains: s, mode: 'insensitive' },
          },
        },
        {
          expertProfile: {
            specialization: { contains: s, mode: 'insensitive' },
          },
        },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { expertProfile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const formatted = users.map((u) => this.mapUserToExpert(u));

    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Find single expert directly from database by ID
   */
  async findOne(id: string): Promise<ExpertItem> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.EXPERT,
      },
      include: {
        expertProfile: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Expert with ID "${id}" was not found`);
    }

    return this.mapUserToExpert(user);
  }

  /**
   * Update expert profile directly in database
   */
  async update(id: string, dto: UpdateExpertDto): Promise<ExpertItem> {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.EXPERT },
      include: { expertProfile: true },
    });

    if (!user) {
      throw new NotFoundException(`Expert with ID "${id}" was not found`);
    }

    const userData: any = {};
    if (dto.name) userData.name = dto.name.trim();
    if (dto.avatar !== undefined) userData.avatar = dto.avatar?.trim() || null;
    if (dto.status) userData.status = dto.status;

    if (dto.password && dto.password.trim()) {
      userData.password = await bcrypt.hash(dto.password.trim(), 10);
    }

    const profileData: any = {};
    if (dto.phone !== undefined) profileData.phone = dto.phone?.trim() || null;
    if (dto.specialization) profileData.specialization = dto.specialization.trim();
    if (dto.designation) profileData.designation = dto.designation.trim();
    if (dto.experienceYears !== undefined) {
      profileData.experienceYears = String(dto.experienceYears);
    }
    if (dto.bio !== undefined) profileData.bio = dto.bio?.trim() || null;
    if (dto.isAvailableForSupport !== undefined) {
      profileData.isAvailableForSupport = dto.isAvailableForSupport;
    }
    if (dto.rating !== undefined) profileData.rating = dto.rating;
    if (dto.assignedTicketsCount !== undefined) {
      profileData.assignedTicketsCount = dto.assignedTicketsCount;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        expertProfile: {
          upsert: {
            create: {
              specialization: dto.specialization?.trim() || '',
              designation: dto.designation?.trim() || '',
              ...profileData,
            },
            update: profileData,
          },
        },
      },
      include: {
        expertProfile: true,
      },
    });

    return this.mapUserToExpert(updated);
  }

  /**
   * Toggle or update expert status directly in database
   */
  async updateStatus(id: string, dto: UpdateExpertStatusDto): Promise<ExpertItem> {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.EXPERT },
    });

    if (!user) {
      throw new NotFoundException(`Expert with ID "${id}" was not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      include: { expertProfile: true },
    });

    return this.mapUserToExpert(updated);
  }

  /**
   * Delete expert account and profile from database
   */
  async remove(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.EXPERT },
    });

    if (!user) {
      throw new NotFoundException(`Expert with ID "${id}" was not found`);
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return {
      message: `Expert ${user.name} removed successfully`,
    };
  }

  /**
   * 100% dynamic metrics aggregation computed directly from database
   */
  async getMetrics() {
    const totalExperts = await this.prisma.user.count({
      where: { role: Role.EXPERT },
    });

    const activeExperts = await this.prisma.user.findMany({
      where: {
        role: Role.EXPERT,
        status: UserStatus.ACTIVE,
      },
      include: {
        expertProfile: true,
      },
    });

    const activeSupport = activeExperts.filter(
      (e) => e.expertProfile?.isAvailableForSupport !== false,
    ).length;

    const allProfiles = await this.prisma.expertProfile.findMany();

    const totalTickets = allProfiles.reduce(
      (acc, curr) => acc + (curr.assignedTicketsCount || 0),
      0,
    );

    const averageRating =
      allProfiles.length > 0
        ? Number(
            (
              allProfiles.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
              allProfiles.length
            ).toFixed(1),
          )
        : 0;

    return {
      totalExperts,
      activeSupport,
      totalTickets,
      averageRating,
    };
  }
}
