import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CoursesService } from './courses.service';

describe('CoursesService reviews', () => {
  const courseReview = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const service = new CoursesService(
    { courseReview } as unknown as PrismaService,
    {} as NotificationsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('only features shown 4+ star reviews with a comment on active courses', async () => {
    courseReview.findMany.mockResolvedValue([]);

    await service.findFeaturedReviews(3);

    const calls = courseReview.findMany.mock.calls as unknown[][];
    const args = calls[0][0] as {
      where: Record<string, unknown>;
      take: number;
    };
    expect(args.where).toEqual({
      isActive: true,
      rating: { gte: 4 },
      comment: { not: null },
      course: { isActive: true },
    });
    expect(args.take).toBe(3);
  });

  it('hides a review', async () => {
    courseReview.findUnique.mockResolvedValue({ id: 'r1' });
    courseReview.update.mockResolvedValue({ id: 'r1', isActive: false });

    const result = await service.adminSetReviewActive('r1', false);

    expect(courseReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'r1' },
        data: { isActive: false },
      }),
    );
    expect(result.data.review.isActive).toBe(false);
  });

  it('rejects an unknown review', async () => {
    courseReview.findUnique.mockResolvedValue(null);

    await expect(
      service.adminSetReviewActive('missing', false),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(courseReview.update).not.toHaveBeenCalled();
  });
});
