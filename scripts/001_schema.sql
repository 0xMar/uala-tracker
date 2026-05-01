-- Create statements table
CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- YYYY-MM format
  version INT DEFAULT 1,
  is_paid BOOLEAN DEFAULT FALSE,
  total_debt_ars NUMERIC,
  minimum_payment NUMERIC,
  previous_balance NUMERIC,
  credit_limit NUMERIC,
  tna NUMERIC, -- Total annual rate (TNA) — actual from P1 table
  tea NUMERIC, -- Tasa Efectiva Anual — actual from P1 table
  cftea_con_iva NUMERIC, -- Costo Financiero Total Efectivo Anual con IVA — actual from P1 table
  cftna_con_iva NUMERIC, -- Costo Financiero Total Nominal Anual con IVA — actual from P1 table
  tna_anunciada NUMERIC, -- TNA anunciada en el bloque legal (próximo período)
  tea_anunciada NUMERIC, -- TEA anunciada en el bloque legal
  tem_anunciada NUMERIC, -- TEM anunciada en el bloque legal
  cftea_con_iva_anunciada NUMERIC, -- CFTEA con IVA anunciada en el bloque legal
  cftna_con_iva_anunciada NUMERIC, -- CFTNA con IVA anunciada en el bloque legal
  close_date DATE,
  due_date DATE,
  next_close_date DATE,
  next_due_date DATE,
  period_from DATE,
  period_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  merchant TEXT NOT NULL,
  amount_ars NUMERIC NOT NULL,
  installment_current INT,
  installments_total INT,
  coupon_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('CONSUMO', 'PAGO', 'IMPUESTO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on statements
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for statements
CREATE POLICY "Users can read their own statements"
  ON statements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statements"
  ON statements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statements"
  ON statements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own statements"
  ON statements FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for transactions
CREATE POLICY "Users can read their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_statements_user_id ON statements(user_id);
CREATE INDEX IF NOT EXISTS idx_statements_period ON statements(period);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_id ON transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
