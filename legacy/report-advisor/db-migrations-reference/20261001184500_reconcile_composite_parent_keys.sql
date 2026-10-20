-- Restore parity for composite parent keys required by live cross-company foreign keys.
-- Source-of-truth: Report-Advisor staging project fnqbvfuwbdpwvhcgzksl on 2026-10-01.

create unique index if not exists purchase_invoices_company_id_id_key
  on public.purchase_invoices(company_id, id);

create unique index if not exists products_company_id_id_key
  on public.products(company_id, id);
