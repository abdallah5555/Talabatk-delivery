import { supabase } from './supabase';

export async function getAdminDashboardSnapshot(){
  const [profiles,stores,orders,merchantApps,driverApps,issues,deletions]=await Promise.all([
    supabase.from('profiles').select('id',{count:'exact',head:true}),
    supabase.from('stores').select('id',{count:'exact',head:true}),
    supabase.from('orders').select('status,total').limit(500),
    supabase.from('merchant_applications').select('id',{count:'exact',head:true}).eq('status','pending'),
    supabase.from('driver_applications').select('id',{count:'exact',head:true}).eq('status','pending'),
    supabase.from('driver_issues').select('id',{count:'exact',head:true}).in('status',['open','in_progress']),
    supabase.from('deletion_requests').select('id',{count:'exact',head:true}).in('status',['pending','processing']),
  ]);
  for(const q of [profiles,stores,orders,merchantApps,driverApps,issues,deletions]) if(q.error) throw q.error;
  const rows=orders.data??[];
  const active=rows.filter((x:any)=>!['delivered','cancelled','rejected'].includes(x.status)).length;
  const delivered=rows.filter((x:any)=>x.status==='delivered');
  const revenue=delivered.reduce((sum:number,x:any)=>sum+Number(x.total??0),0);
  return {
    users:profiles.count??0,
    stores:stores.count??0,
    activeOrders:active,
    totalOrders:rows.length,
    deliveredRevenue:revenue,
    pendingApplications:(merchantApps.count??0)+(driverApps.count??0),
    openIssues:issues.count??0,
    deletionRequests:deletions.count??0,
  };
}
