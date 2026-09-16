drop policy if exists "Library assets are service-only" on public.mqd_library_assets;
create policy "Library assets are service-only"
on public.mqd_library_assets
for all
to anon, authenticated
using (false)
with check (false);

drop policy if exists "Library placements are service-only" on public.mqd_library_asset_placements;
create policy "Library placements are service-only"
on public.mqd_library_asset_placements
for all
to anon, authenticated
using (false)
with check (false);
