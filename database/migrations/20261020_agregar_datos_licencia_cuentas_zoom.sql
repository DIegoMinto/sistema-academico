
ALTER TABLE public.cuentas_zoom
  ADD COLUMN IF NOT EXISTS fecha_pago DATE,
  ADD COLUMN IF NOT EXISTS fecha_caducidad DATE,
  ADD COLUMN IF NOT EXISTS importe_usd NUMERIC(10, 2);
