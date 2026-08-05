-- Run after policies-and-views.sql and tracking-upgrade.sql.
-- Ensures a browser retry cannot double-count a completed purchase.

create unique index if not exists conversions_purchase_id_unique
  on public.conversions (purchase_id)
  where purchase_id is not null;
