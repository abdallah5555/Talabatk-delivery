alter table public.notifications add column if not exists order_id uuid references public.orders(id) on delete set null;
create index if not exists notifications_user_order_idx on public.notifications(user_id,order_id,created_at desc);

create or replace function public.notify_order_change()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_store_name text; v_status_label text; v_owner_id uuid;
begin
  select name,owner_id into v_store_name,v_owner_id from public.stores where id=NEW.store_id;
  if TG_OP='INSERT' then
    if v_owner_id is not null then
      insert into public.notifications(user_id,title,body,kind,is_read,order_id)
      values(v_owner_id,'طلب جديد',coalesce(v_store_name,'المتجر')||' • طلب #'||left(NEW.id::text,6)||case when NEW.scheduled_for is not null then ' • مجدول '||to_char(NEW.scheduled_for at time zone 'Africa/Cairo','YYYY-MM-DD HH24:MI') else '' end,'order',false,NEW.id);
    end if;
    return NEW;
  end if;
  if NEW.status is distinct from OLD.status or NEW.driver_id is distinct from OLD.driver_id then
    v_status_label := case NEW.status when 'pending' then 'بنأكد الطلب' when 'accepted' then 'المتجر استلم' when 'preparing' then 'بيجهز طلبك' when 'ready' then 'جاهز للسائق' when 'assigned' then 'السائق استلمه' when 'picked_up' then 'اتستلم من المتجر' when 'on_the_way' then 'في الطريق ليك' when 'delivered' then 'اتسلّم بنجاح' when 'cancelled' then 'اتلغى' when 'rejected' then 'مرفوض' else NEW.status::text end;
    if NEW.customer_id is not null and NEW.status is distinct from OLD.status then insert into public.notifications(user_id,title,body,kind,is_read,order_id) values(NEW.customer_id,'تحديث طلبك',coalesce(v_store_name,'المتجر')||' • '||v_status_label,'order',false,NEW.id); end if;
    if v_owner_id is not null and NEW.status is distinct from OLD.status then insert into public.notifications(user_id,title,body,kind,is_read,order_id) values(v_owner_id,'تحديث تشغيل','الطلب #'||left(NEW.id::text,6)||' أصبح: '||v_status_label,'order',false,NEW.id); end if;
    if NEW.driver_id is not null and (NEW.driver_id is distinct from OLD.driver_id or NEW.status is distinct from OLD.status) then insert into public.notifications(user_id,title,body,kind,is_read,order_id) values(NEW.driver_id,case when NEW.driver_id is distinct from OLD.driver_id then 'طلب جديد اتسند ليك' else 'تحديث رحلة' end,coalesce(v_store_name,'متجر')||' • الطلب #'||left(NEW.id::text,6)||' • '||v_status_label,'order',false,NEW.id); end if;
  end if;
  return NEW;
end;
$$;
revoke all on function public.notify_order_change() from public,anon,authenticated;
grant execute on function public.notify_order_change() to service_role;
