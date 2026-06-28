import type { FilterQuery } from 'mongoose';
import { TaxDeclaration, type TaxDeclarationDoc } from '@/models/TaxDeclaration';
import { TaxProof, type TaxProofDoc } from '@/models/TaxProof';
import { escapeRegex, type ListQuery } from '@/lib/utils/pagination';
import { BaseRepository } from './base.repository';

export type TaxDeclarationFilter = {
  financialYear?: string;
  status?: string;
  regime?: string;
  employeeId?: string;
};

class TaxDeclarationRepository extends BaseRepository<TaxDeclarationDoc> {
  constructor() {
    super(TaxDeclaration);
  }

  /** List declarations with FY/status/regime filters and FY-text search. */
  async search(companyId: string, query: ListQuery, filter: TaxDeclarationFilter) {
    const where: FilterQuery<TaxDeclarationDoc> = {};
    if (filter.financialYear) where.financialYear = filter.financialYear;
    if (filter.status) where.status = filter.status;
    if (filter.regime) where.regime = filter.regime;
    if (filter.employeeId) where.employeeId = filter.employeeId;

    if (query.search) {
      const rx = new RegExp(escapeRegex(query.search), 'i');
      where.financialYear = rx as unknown as string;
    }

    return this.list(companyId, query, where, {
      populate: ['employeeId'],
    });
  }
}

class TaxProofRepository extends BaseRepository<TaxProofDoc> {
  constructor() {
    super(TaxProof);
  }

  /** All proofs attached to one declaration (tenant-scoped, soft-delete aware). */
  async listForDeclaration(companyId: string, declarationId: string) {
    return this.collection
      .find({ companyId, declarationId, isDeleted: false })
      .sort({ createdAt: -1 })
      .lean<TaxProofDoc[]>({ virtuals: true })
      .exec();
  }
}

export const taxDeclarationRepository = new TaxDeclarationRepository();
export const taxProofRepository = new TaxProofRepository();
