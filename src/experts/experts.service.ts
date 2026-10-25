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
   * 100% dynamic - extracts directly from database record and incorporates live consultation ratings.
   */
  private mapUserToExpert(
    user: any,
    liveRating?: number,
    liveTicketsCount?: number,
  ): ExpertItem {
    const computedRating =
      liveRating !== undefined
        ? liveRating
        : user.expertProfile?.rating != null
        ? Number(user.expertProfile.rating)
        : 5.0;

    const computedTicketsCount =
      liveTicketsCount !== undefined
        ? liveTicketsCount
        : user.expertProfile?.assignedTicketsCount ?? 0;

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
      assignedTicketsCount: computedTicketsCount,
      rating: computedRating,
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
   * Find all experts with optional filtering and search directly from database.
   * Ratings and tickets count are calculated live from consultation tickets!
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

    const [users, total, allTickets] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { expertProfile: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.prisma.consultationTicket.findMany({
        select: {
          id: true,
          assignedExpertId: true,
          assignedExpertName: true,
          ratingStars: true,
        },
      }),
    ]);

    const formatted = users.map((u) => {
      const userTickets = allTickets.filter((t) => {
        const matchId =
          t.assignedExpertId &&
          (t.assignedExpertId === u.id || t.assignedExpertId === u.expertProfile?.id);
        const matchName =
          t.assignedExpertName &&
          u.name &&
          t.assignedExpertName.trim().toLowerCase() === u.name.trim().toLowerCase();
        return matchId || matchName;
      });

      const rated = userTickets.filter(
        (t) => typeof t.ratingStars === 'number' && t.ratingStars > 0,
      );

      const liveRating =
        rated.length > 0
          ? Number(
              (
                rated.reduce((sum, t) => sum + (t.ratingStars || 0), 0) /
                rated.length
              ).toFixed(1),
            )
          : u.expertProfile?.rating != null
          ? Number(u.expertProfile.rating)
          : 5.0;

      const liveTicketsCount = userTickets.length;

      return this.mapUserToExpert(u, liveRating, liveTicketsCount);
    });

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
   * Find single expert directly from database by ID with live consultation rating
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

    const userTickets = await this.prisma.consultationTicket.findMany({
      where: {
        OR: [
          { assignedExpertId: user.id },
          ...(user.expertProfile?.id ? [{ assignedExpertId: user.expertProfile.id }] : []),
          { assignedExpertName: { equals: user.name, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        ratingStars: true,
      },
    });

    const rated = userTickets.filter(
      (t) => typeof t.ratingStars === 'number' && t.ratingStars > 0,
    );

    const liveRating =
      rated.length > 0
        ? Number(
            (
              rated.reduce((sum, t) => sum + (t.ratingStars || 0), 0) /
              rated.length
            ).toFixed(1),
          )
        : user.expertProfile?.rating != null
        ? Number(user.expertProfile.rating)
        : 5.0;

    const liveTicketsCount = userTickets.length;

    return this.mapUserToExpert(user, liveRating, liveTicketsCount);
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
   * 100% dynamic metrics aggregation computed directly from database,
   * with average rating and total tickets derived from consultation tickets.
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

    // Fetch all consultation tickets
    const allTickets = await this.prisma.consultationTicket.findMany({
      select: {
        id: true,
        ratingStars: true,
      },
    });

    const totalTickets = allTickets.length;
    const ratedTickets = allTickets.filter(
      (t) => typeof t.ratingStars === 'number' && t.ratingStars > 0,
    );

    let averageRating = 0;
    if (ratedTickets.length > 0) {
      averageRating = Number(
        (
          ratedTickets.reduce((acc, curr) => acc + (curr.ratingStars || 0), 0) /
          ratedTickets.length
        ).toFixed(1),
      );
    } else {
      const allProfiles = await this.prisma.expertProfile.findMany({
        select: { rating: true },
      });
      averageRating =
        allProfiles.length > 0
          ? Number(
              (
                allProfiles.reduce((acc, curr) => acc + (curr.rating || 0), 0) /
                allProfiles.length
              ).toFixed(1),
            )
          : 0;
    }

    return {
      totalExperts,
      activeSupport,
      totalTickets,
      averageRating,
    };
  }
}
