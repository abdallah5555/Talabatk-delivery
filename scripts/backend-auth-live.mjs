import { createClient } from '@supabase/supabase-js';

const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if(!url||!anon) throw new Error('Missing public Supabase configuration');

const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const anonClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});

async function expectDenied(label,fn){
  const {data,error}=await fn();
  assert(Boolean(error)||!data||Array.isArray(data)&&data.length===0,`${label}: anonymous access unexpectedly succeeded`);
  console.log(`✓ ${label}`);
}

async function main(){
  const {data:profiles,error:profilesError}=await anonClient.from('profiles').select('id').limit(1);
  assert(Boolean(profilesError)||(profiles??[]).length===0,'anonymous client can read private profiles');
  console.log('✓ anonymous profile reads are blocked by RLS');

  await expectDenied('anonymous address write is blocked',()=>anonClient.rpc('save_my_address',{
    p_label:'security-test',p_address:'security-test',p_latitude:30,p_longitude:31,p_is_default:false
  }));
  await expectDenied('anonymous merchant application submission is blocked',()=>anonClient.rpc('submit_merchant_application',{
    p_business_name:'security-test',p_category:'test',p_address:'test',p_latitude:30,p_longitude:31,
    p_logo_url:'x',p_national_id_front_path:'x',p_national_id_back_path:'x',p_commercial_registration_path:'x',p_tax_card_path:null
  }));
  await expectDenied('anonymous driver application submission is blocked',()=>anonClient.rpc('submit_driver_application',{
    p_transport_mode:'bicycle',p_motorcycle_type:'',p_profile_photo_url:'x',p_national_id_front_path:'x',p_national_id_back_path:'x',
    p_driving_license_front_path:null,p_driving_license_back_path:null,p_vehicle_license_front_path:null,p_vehicle_license_back_path:null,p_police_clearance_path:null
  }));

  const bad=await anonClient.auth.signInWithPassword({email:'not-a-real-user@talabatk.invalid',password:'DefinitelyWrong123!'});
  assert(Boolean(bad.error)&&!bad.data.session,'invalid authentication was unexpectedly accepted');
  console.log('✓ invalid authentication is rejected');

  const email=process.env.BACKEND_TEST_EMAIL;
  const password=process.env.BACKEND_TEST_PASSWORD;
  if(!email||!password){
    console.log('ℹ authenticated smoke skipped: BACKEND_TEST_EMAIL/BACKEND_TEST_PASSWORD not configured');
    return;
  }

  const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
  const login=await authClient.auth.signInWithPassword({email,password});
  assert(!login.error&&login.data.user&&login.data.session,'test-account login failed');
  const userId=login.data.user.id;
  console.log('✓ test-account login succeeds');

  const profile=await authClient.from('profiles').select('id,full_name,phone,is_active').eq('id',userId).single();
  assert(!profile.error&&profile.data?.id===userId,'signed-in user cannot read own profile');
  console.log('✓ signed-in user can read own profile');

  const roles=await authClient.from('user_roles').select('role,user_id').eq('user_id',userId);
  assert(!roles.error&&(roles.data??[]).every(row=>row.user_id===userId),'signed-in role lookup failed or crossed user boundary');
  console.log('✓ signed-in role lookup is self-scoped');

  const otherProfiles=await authClient.from('profiles').select('id').neq('id',userId).limit(1);
  assert(Boolean(otherProfiles.error)||(otherProfiles.data??[]).length===0,'signed-in non-admin test user can read another profile');
  console.log('✓ cross-user profile read is blocked');

  const session=await authClient.auth.getSession();
  assert(session.data.session?.user.id===userId,'session round-trip failed');
  console.log('✓ auth session round-trip succeeds');
}

main().catch((error)=>{console.error(error);process.exit(1)});
