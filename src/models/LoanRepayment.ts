/**
 * One installment row of a loan's amortization schedule. Generated up-front when
 * the loan is created; `paid` flips to true as payroll recovers each EMI. Kept in
 * its own collection so a long-tenure loan never bloats the parent document.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type LoanRepaymentDoc = WithBase<{
  loanId: Types.ObjectId;
  /** 1-based installment number within the loan tenure. */
  monthIndex: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  /** Outstanding principal after this installment. */
  balance: number;
  paid: boolean;
  paidOn?: Date | null;
}>;

const LoanRepaymentSchema = new Schema<LoanRepaymentDoc>(
  {
    ...baseFields,
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    monthIndex: { type: Number, required: true, min: 1 },
    emi: { type: Number, required: true, min: 0 },
    principalPart: { type: Number, required: true, min: 0 },
    interestPart: { type: Number, required: true, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    paid: { type: Boolean, default: false, index: true },
    paidOn: { type: Date, default: null },
  },
  baseSchemaOptions,
);

LoanRepaymentSchema.index({ companyId: 1, loanId: 1, monthIndex: 1 }, { unique: true });

export const LoanRepayment: Model<LoanRepaymentDoc> =
  (models.LoanRepayment as Model<LoanRepaymentDoc>) ??
  model<LoanRepaymentDoc>('LoanRepayment', LoanRepaymentSchema);
