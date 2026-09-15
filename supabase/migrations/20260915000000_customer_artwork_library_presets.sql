alter table public.mqd_library_assets
  add column if not exists placement_preset text not null default 'full',
  add column if not exists pixel_width integer,
  add column if not exists pixel_height integer,
  add column if not exists reverse_back boolean not null default false,
  add column if not exists stack_order integer not null default 0;

alter table public.mqd_library_assets
  drop constraint if exists mqd_library_assets_placement_preset_check;

alter table public.mqd_library_assets
  add constraint mqd_library_assets_placement_preset_check
  check (placement_preset in ('full','top','bottom','free'));

alter table public.mqd_library_assets
  drop constraint if exists mqd_library_assets_pixel_width_check;

alter table public.mqd_library_assets
  add constraint mqd_library_assets_pixel_width_check
  check (pixel_width is null or pixel_width between 1 and 50000);

alter table public.mqd_library_assets
  drop constraint if exists mqd_library_assets_pixel_height_check;

alter table public.mqd_library_assets
  add constraint mqd_library_assets_pixel_height_check
  check (pixel_height is null or pixel_height between 1 and 50000);

alter table public.mqd_library_asset_placements
  drop constraint if exists mqd_library_asset_placements_x_check;

alter table public.mqd_library_asset_placements
  add constraint mqd_library_asset_placements_x_check
  check (x between -1000 and 1000);

alter table public.mqd_library_asset_placements
  drop constraint if exists mqd_library_asset_placements_y_check;

alter table public.mqd_library_asset_placements
  add constraint mqd_library_asset_placements_y_check
  check (y between -1000 and 1000);

create index if not exists mqd_library_assets_stack_idx
  on public.mqd_library_assets(active,category,stack_order,sort_order,name);

