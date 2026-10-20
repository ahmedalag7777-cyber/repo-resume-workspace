-- Reconstructed from live constraint state on 2026-08-29.
-- The stricter positive quantity invariant is intentionally kept distinct from
-- the earlier non-negative invariant for provenance compatibility.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid='public.inventory_movements'::regclass
      AND conname='inventory_movements_quantity_positive'
  ) THEN
    ALTER TABLE public.inventory_movements
      ADD CONSTRAINT inventory_movements_quantity_positive CHECK (quantity > 0);
  END IF;
END $$;
