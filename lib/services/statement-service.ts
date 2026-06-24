import type { IExtractionGateway } from '@/lib/gateways/extraction-gateway'
import type { IStatementRepository } from '@/lib/repositories/statement-repository'
import type { ITransactionRepository } from '@/lib/repositories/transaction-repository'
import type { ExtractResponse, UploadResult } from '@/lib/types'

export class StatementService {
  constructor(
    private gateway: IExtractionGateway,
    private stmtRepo: IStatementRepository,
    private txnRepo: ITransactionRepository,
  ) {}

  async uploadStatement(
    userId: string,
    file: File,
    forceReplace: boolean,
  ): Promise<UploadResult> {
    try {
      // Step 1: Extract PDF data via gateway
      let extractResponse: ExtractResponse
      try {
        extractResponse = await this.gateway.extract(file)
      } catch (e) {
        return { success: false, error: (e as Error).message }
      }

      const { statement: extractedStatement, transactions: extractedTransactions } = extractResponse

      // Step 2: Check if statement for this period already exists
      const existingStatement = await this.stmtRepo.findByPeriod(
        userId,
        extractedStatement.period,
      )

      if (existingStatement && !forceReplace) {
        return {
          success: false,
          duplicatePeriod: extractedStatement.period,
          error: 'A statement for this period already exists',
        }
      }

      let statementId: string

      if (existingStatement && forceReplace) {
        // Step 3a: Replace existing — delete old transactions first
        try {
          await this.stmtRepo.deleteTransactions(existingStatement.id)
        } catch (e) {
          console.error('Failed to delete old transactions:', e)
          return { success: false, error: 'Failed to replace existing statement' }
        }

        // Update statement with new data and increment version
        try {
          await this.stmtRepo.update(existingStatement.id, {
            version: existingStatement.version + 1,
            is_paid: false,
            total_debt_ars: extractedStatement.total_debt_ars,
            minimum_payment: extractedStatement.minimum_payment,
            previous_balance: extractedStatement.previous_balance,
            credit_limit: extractedStatement.credit_limit,
            tna: extractedStatement.tna,
            tea: extractedStatement.tea,
            cftea_con_iva: extractedStatement.cftea_con_iva,
            cftna_con_iva: extractedStatement.cftna_con_iva,
            tna_anunciada: extractedStatement.tna_anunciada,
            tea_anunciada: extractedStatement.tea_anunciada,
            tem_anunciada: extractedStatement.tem_anunciada,
            cftea_con_iva_anunciada: extractedStatement.cftea_con_iva_anunciada,
            cftna_con_iva_anunciada: extractedStatement.cftna_con_iva_anunciada,
            close_date: extractedStatement.close_date,
            due_date: extractedStatement.due_date,
            next_close_date: extractedStatement.next_close_date,
            next_due_date: extractedStatement.next_due_date,
            period_from: extractedStatement.period_from,
            period_to: extractedStatement.period_to,
          })
        } catch (e) {
          console.error('Failed to update statement:', e)
          return { success: false, error: 'Failed to update statement' }
        }

        statementId = existingStatement.id
      } else {
        // Step 3b: Insert new statement
        try {
          statementId = await this.stmtRepo.create({
            user_id: userId,
            period: extractedStatement.period,
            version: 1,
            is_paid: false,
            total_debt_ars: extractedStatement.total_debt_ars,
            minimum_payment: extractedStatement.minimum_payment,
            previous_balance: extractedStatement.previous_balance,
            credit_limit: extractedStatement.credit_limit,
            tna: extractedStatement.tna,
            tea: extractedStatement.tea,
            cftea_con_iva: extractedStatement.cftea_con_iva,
            cftna_con_iva: extractedStatement.cftna_con_iva,
            tna_anunciada: extractedStatement.tna_anunciada,
            tea_anunciada: extractedStatement.tea_anunciada,
            tem_anunciada: extractedStatement.tem_anunciada,
            cftea_con_iva_anunciada: extractedStatement.cftea_con_iva_anunciada,
            cftna_con_iva_anunciada: extractedStatement.cftna_con_iva_anunciada,
            close_date: extractedStatement.close_date,
            due_date: extractedStatement.due_date,
            next_close_date: extractedStatement.next_close_date,
            next_due_date: extractedStatement.next_due_date,
            period_from: extractedStatement.period_from,
            period_to: extractedStatement.period_to,
          })
        } catch (e) {
          const err = e as { code?: string }
          // Unique constraint violation (race condition)
          if (err.code === '23505') {
            return {
              success: false,
              duplicatePeriod: extractedStatement.period,
              error: 'A statement for this period already exists',
            }
          }
          return { success: false, error: 'Failed to save statement' }
        }
      }

      // Step 4: Insert all transactions
      if (extractedTransactions.length > 0) {
        try {
          await this.txnRepo.insertMany(
            extractedTransactions.map((txn) => ({
              user_id: userId,
              statement_id: statementId,
              transaction_date: txn.transaction_date,
              merchant: txn.merchant,
              amount_ars: txn.amount_ars,
              installment_current: txn.installment_current,
              installments_total: txn.installments_total,
              coupon_number: txn.coupon_number,
              type: txn.type,
            })),
          )
        } catch (e) {
          console.error('Failed to insert transactions:', e)
          return { success: false, error: 'Failed to save transactions' }
        }
      }

      return { success: true, statementId }
    } catch (error) {
      console.error('Upload error:', error)
      return { success: false, error: 'Failed to upload statement' }
    }
  }

  async toggleStatementPaid(
    userId: string,
    statementId: string,
    isPaid: boolean,
  ): Promise<void> {
    const updated = await this.stmtRepo.updatePaidStatus(statementId, userId, isPaid)
    if (!updated) {
      throw new Error('Statement not found or access denied')
    }
  }
}
