-- Explicit client-deny policies document the service-only boundary.
create policy mqd_shirt_games_deny_client on public.mqd_shirt_games for all to anon,authenticated using(false) with check(false);
create policy mqd_shirt_game_assets_deny_client on public.mqd_shirt_game_assets for all to anon,authenticated using(false) with check(false);
create policy mqd_shirt_game_drafts_deny_client on public.mqd_shirt_game_drafts for all to anon,authenticated using(false) with check(false);
create policy mqd_shirt_game_settings_deny_client on public.mqd_shirt_game_settings for all to anon,authenticated using(false) with check(false);
create policy mqd_shirt_game_limits_deny_client on public.mqd_shirt_game_limits for all to anon,authenticated using(false) with check(false);
comment on table public.mqd_shirt_games is 'Private engine state. Only the validated Shirt Games service may access it; unrevealed contributions never go to other clients.';
comment on table public.mqd_shirt_game_assets is 'Private photo references. Original uploads are never signed for group reveal.';
