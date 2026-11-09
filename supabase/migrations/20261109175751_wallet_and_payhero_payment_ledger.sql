-- Wallet and PayHero payment ledger. Applied as migration 20261109175751.
create table public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_credits bigint not null default 0 check (balance_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null check (char_length(package_id) between 1 and 80),
  amount_kes integer not null check (amount_kes > 0),
  credits bigint not null check (credits > 0),
  external_reference text not null unique,
  payhero_reference text unique,
  checkout_request_id text unique,
  status text not null default 'pending' check (status in ('pending','queued','success','failed','cancelled')),
  mpesa_receipt text,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create table public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_intent_id uuid unique references public.payment_intents(id),
  entry_type text not null check (entry_type in ('purchase','spend','adjustment')),
  credits_delta bigint not null check (credits_delta <> 0),
  balance_after bigint not null check (balance_after >= 0),
  description text not null check (char_length(description) between 1 and 240),
  created_at timestamptz not null default now()
);
create index payment_intents_user_created_idx on public.payment_intents(user_id, created_at desc);
create index payment_intents_status_created_idx on public.payment_intents(status, created_at);
create index wallet_transactions_user_created_idx on public.wallet_transactions(user_id, created_at desc);
alter table public.wallets enable row level security;
alter table public.payment_intents enable row level security;
alter table public.wallet_transactions enable row level security;
revoke all on public.wallets, public.payment_intents, public.wallet_transactions from anon, authenticated;
grant select on public.wallets, public.payment_intents, public.wallet_transactions to authenticated;
create policy "Users read their own wallet" on public.wallets for select to authenticated using (user_id = (select auth.uid()));
create policy "Users read their own payment intents" on public.payment_intents for select to authenticated using (user_id = (select auth.uid()));
create policy "Users read their own wallet transactions" on public.wallet_transactions for select to authenticated using (user_id = (select auth.uid()));

create or replace function app_private.settle_payhero_payment(
  p_external_reference text,p_payhero_reference text,p_amount_kes integer,p_mpesa_receipt text,p_provider_payload jsonb
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v_intent public.payment_intents%rowtype; v_balance bigint;
begin
  select * into v_intent from public.payment_intents where external_reference=p_external_reference for update;
  if not found then raise exception 'Payment intent not found'; end if;
  if v_intent.status='success' then return false; end if;
  if v_intent.payhero_reference is null or v_intent.payhero_reference<>p_payhero_reference or v_intent.amount_kes<>p_amount_kes then
    raise exception 'Payment verification details do not match';
  end if;
  update public.payment_intents set status='success',mpesa_receipt=nullif(p_mpesa_receipt,''),provider_payload=p_provider_payload,paid_at=now(),updated_at=now() where id=v_intent.id;
  insert into public.wallets(user_id,balance_credits,updated_at) values(v_intent.user_id,v_intent.credits,now())
  on conflict(user_id) do update set balance_credits=public.wallets.balance_credits+excluded.balance_credits,updated_at=now()
  returning balance_credits into v_balance;
  insert into public.wallet_transactions(user_id,payment_intent_id,entry_type,credits_delta,balance_after,description)
  values(v_intent.user_id,v_intent.id,'purchase',v_intent.credits,v_balance,'Nightlife KE credit package '||v_intent.package_id);
  return true;
end;
$$;
revoke all on function app_private.settle_payhero_payment(text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function app_private.settle_payhero_payment(text,text,integer,text,jsonb) to service_role;
create or replace function public.settle_payhero_payment(
  p_external_reference text,p_payhero_reference text,p_amount_kes integer,p_mpesa_receipt text,p_provider_payload jsonb
) returns boolean language sql security invoker set search_path = '' as $$
  select app_private.settle_payhero_payment(p_external_reference,p_payhero_reference,p_amount_kes,p_mpesa_receipt,p_provider_payload);
$$;
revoke all on function public.settle_payhero_payment(text,text,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.settle_payhero_payment(text,text,integer,text,jsonb) to service_role;
