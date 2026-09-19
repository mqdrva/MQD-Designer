-- Apply only after mqd-save-artwork and the updated customer client are live.
-- Service-role uploads go through validated paths and atomic daily budgets.
alter policy customer_artwork_insert_own on storage.objects with check (false);
alter policy customer_artwork_update_own on storage.objects using (false) with check (false);
