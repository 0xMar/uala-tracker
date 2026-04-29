export interface Statement {
  id: string;
  user_id: string;
  period: string; // YYYY-MM
  version: number;
  is_paid: boolean;
  total_debt_ars: number | null;
  minimum_payment: number | null;
  previous_balance: number | null;
  credit_limit: number | null;
  tna: number | null;
  close_date: string | null;
  due_date: string | null;
  next_close_date: string | null;
  next_due_date: string | null;
  period_from: string | null;
  period_to: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  statement_id: string;
  transaction_date: string;
  merchant: string;
  amount_ars: number;
  installment_current: number | null;
  installments_total: number | null;
  coupon_number: string | null;
  type: 'CONSUMO' | 'PAGO' | 'IMPUESTO';
  created_at: string;
}
