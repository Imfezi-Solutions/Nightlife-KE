create table if not exists public.club_item_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  item_key text not null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  acquired_at timestamptz not null default now(),
  primary key (user_id, club_id, item_key)
);

alter table public.club_item_inventory enable row level security;
drop policy if exists "Users can view their own club inventory" on public.club_item_inventory;
create policy "Users can view their own club inventory"
  on public.club_item_inventory for select
  to authenticated using (auth.uid() = user_id);

create or replace function public.purchase_club_item(
  p_club_id uuid,
  p_room_id uuid,
  p_item_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_item_name text;
  v_price integer;
  v_balance integer;
  v_quantity integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;

  select case p_item_key
    when 'virtual_cocktail' then 'Virtual cocktail'
    when 'mocktail' then 'Tropical mocktail'
    when 'soda' then 'Chilled soda'
    when 'glowstick' then 'Neon glowstick'
    when 'vip_token' then 'VIP table pass'
    else null
  end,
  case p_item_key
    when 'virtual_cocktail' then 15
    when 'mocktail' then 12
    when 'soda' then 8
    when 'glowstick' then 10
    when 'vip_token' then 50
    else null
  end
  into v_item_name, v_price;

  if v_item_name is null then raise exception 'Unknown club item'; end if;

  if not exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = v_user
  ) then raise exception 'Club membership required'; end if;

  if not exists (
    select 1 from public.rooms
    where id = p_room_id and club_id = p_club_id and is_active = true
  ) then raise exception 'Active club room required'; end if;

  if not exists (
    select 1 from public.age_verifications
    where user_id = v_user and status = 'verified'
      and verified_at is not null and expires_at > now()
  ) then raise exception '18+ verification required'; end if;

  insert into public.wallets(user_id, balance_credits)
  values (v_user, 0) on conflict (user_id) do nothing;

  select balance_credits into v_balance
  from public.wallets where user_id = v_user for update;

  if v_balance < v_price then raise exception 'Insufficient credits'; end if;

  update public.wallets
  set balance_credits = balance_credits - v_price, updated_at = now()
  where user_id = v_user
  returning balance_credits into v_balance;

  insert into public.wallet_transactions(
    user_id, credits_delta, balance_after, description, entry_type
  ) values (
    v_user, -v_price, v_balance, 'Nightlife KE virtual item: ' || v_item_name, 'purchase'
  );

  insert into public.club_item_inventory(user_id, club_id, item_key, item_name, quantity)
  values (v_user, p_club_id, p_item_key, v_item_name, 1)
  on conflict (user_id, club_id, item_key)
  do update set quantity = public.club_item_inventory.quantity + 1, acquired_at = now()
  returning quantity into v_quantity;

  return jsonb_build_object(
    'success', true, 'item_name', v_item_name,
    'balance_credits', v_balance, 'quantity', v_quantity
  );
end;
$$;

revoke all on function public.purchase_club_item(uuid, uuid, text) from public;
grant execute on function public.purchase_club_item(uuid, uuid, text) to authenticated;
