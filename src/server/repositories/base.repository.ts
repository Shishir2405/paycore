/**
 * Generic repository — the ONLY layer that talks to Mongoose. Services depend on
 * repositories, never on models directly. Every query is scoped to a `companyId`
 * (multi-tenant isolation) and excludes soft-deleted rows unless asked otherwise.
 */
import type { FilterQuery, Model, SortOrder, Types, UpdateQuery } from 'mongoose';
import type { ListQuery } from '@/lib/utils/pagination';

export type ListResult<T> = { rows: T[]; total: number };

export class BaseRepository<T extends { isDeleted: boolean }> {
  constructor(protected readonly model: Model<T>) {}

  /** Always merge the tenant scope + soft-delete filter into caller filters. */
  protected scoped(companyId: string | Types.ObjectId, filter: FilterQuery<T> = {}): FilterQuery<T> {
    return { ...filter, companyId, isDeleted: false } as FilterQuery<T>;
  }

  async list(
    companyId: string,
    query: Pick<ListQuery, 'skip' | 'limit' | 'sortBy' | 'sortDir'>,
    filter: FilterQuery<T> = {},
    options?: { select?: string; populate?: string | string[] },
  ): Promise<ListResult<T>> {
    const where = this.scoped(companyId, filter);
    const sort: Record<string, SortOrder> = { [query.sortBy]: query.sortDir };

    const q = this.model
      .find(where)
      .sort(sort)
      .skip(query.skip)
      .limit(query.limit)
      .lean<T[]>({ virtuals: true });

    if (options?.select) q.select(options.select);
    if (options?.populate) q.populate(options.populate as string);

    const [rows, total] = await Promise.all([q.exec(), this.model.countDocuments(where)]);
    return { rows, total };
  }

  async findById(
    companyId: string,
    id: string,
    options?: { select?: string; populate?: string | string[] },
  ): Promise<T | null> {
    const q = this.model
      .findOne(this.scoped(companyId, { _id: id } as FilterQuery<T>))
      .lean<T>({ virtuals: true });
    if (options?.select) q.select(options.select);
    if (options?.populate) q.populate(options.populate as string);
    return q.exec();
  }

  async findOne(companyId: string, filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(this.scoped(companyId, filter)).lean<T>({ virtuals: true }).exec();
  }

  async exists(companyId: string, filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(this.scoped(companyId, filter));
    return Boolean(doc);
  }

  async create(data: Partial<T>): Promise<T> {
    const doc = await this.model.create(data);
    return doc.toObject({ virtuals: true }) as T;
  }

  async updateById(companyId: string, id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findOneAndUpdate(this.scoped(companyId, { _id: id } as FilterQuery<T>), update, { new: true })
      .lean<T>({ virtuals: true })
      .exec();
  }

  /** Soft delete: flip the flag and stamp the actor. */
  async softDelete(companyId: string, id: string, actorId?: string): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        this.scoped(companyId, { _id: id } as FilterQuery<T>),
        { isDeleted: true, updatedBy: actorId ?? null } as UpdateQuery<T>,
        { new: true },
      )
      .lean<T>({ virtuals: true })
      .exec();
  }

  /** Raw model access for repositories that need bespoke aggregations. */
  protected get collection(): Model<T> {
    return this.model;
  }
}
