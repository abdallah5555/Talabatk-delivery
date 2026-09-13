import { Stack } from 'expo-router';

export default function AdminLayout(){
  return <Stack screenOptions={{headerTitleAlign:'center',headerBackTitle:'رجوع'}}>
    <Stack.Screen name="index" options={{headerShown:false}}/>
    <Stack.Screen name="applications" options={{title:'طلبات الاعتماد'}}/>
    <Stack.Screen name="operations" options={{title:'التشغيل والمستخدمون'}}/>
    <Stack.Screen name="commerce" options={{title:'الاشتراكات والإعلانات'}}/>
  </Stack>;
}
