-- Avatar customization for Nightlife KE profiles.
-- Applied to Supabase project sauyklppapnsmxcifavq.
alter table public.profiles
add column if not exists avatar_config jsonb not null
default '{"skin":"warm","hair":"curly","outfit":"neon","dance":"groove"}'::jsonb;

alter table public.profiles
add constraint profiles_avatar_config_shape_check
check (
  jsonb_typeof(avatar_config)='object'
  and avatar_config ?& array['skin','hair','outfit','dance']
  and avatar_config->>'skin' in ('warm','deep','light','tan')
  and avatar_config->>'hair' in ('curly','fade','braids','short')
  and avatar_config->>'outfit' in ('neon','street','vip','classic')
  and avatar_config->>'dance' in ('groove','bounce','sway','hype')
);
