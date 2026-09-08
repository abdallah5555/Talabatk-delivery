import { useState, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

export const colors={bg:'#f5f7fa',card:'#ffffff',primary:'#e85d0f',primarySoft:'#fff4ed',text:'#101828',muted:'#667085',border:'#e4e7ec',danger:'#b42318',success:'#067647',dark:'#17212f'};

export function Screen({children}:PropsWithChildren){return <View style={s.screen}>{children}</View>}
export function Card({children}:PropsWithChildren){return <View style={s.card}>{children}</View>}
export function Title({children}:PropsWithChildren){return <Text style={s.title}>{children}</Text>}
export function Muted({children}:PropsWithChildren){return <Text style={s.muted}>{children}</Text>}
export function Field(props:TextInputProps){return <TextInput placeholderTextColor="#98a2b3" {...props} style={[s.field,props.style]}/>}
export function PasswordField(props:TextInputProps){
  const[visible,setVisible]=useState(false);
  return <View style={s.passwordWrap}>
    <TextInput placeholderTextColor="#98a2b3" {...props} secureTextEntry={!visible} style={[s.passwordInput,props.style]}/>
    <Pressable accessibilityRole="button" accessibilityLabel={visible?'إخفاء كلمة المرور':'إظهار كلمة المرور'} onPress={()=>setVisible(v=>!v)} style={s.passwordToggle}>
      <Text style={s.passwordToggleText}>{visible?'إخفاء':'إظهار'}</Text>
    </Pressable>
  </View>
}
export function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[s.button,pressed&&!disabled&&s.buttonPressed,disabled&&s.disabled]}><Text style={s.buttonText}>{title}</Text></Pressable>}

const s=StyleSheet.create({
  screen:{flex:1,backgroundColor:colors.bg,padding:18,gap:14,direction:'rtl'},
  card:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:22,padding:17,gap:11,shadowColor:'#101828',shadowOpacity:0.05,shadowRadius:12,shadowOffset:{width:0,height:4},elevation:2},
  title:{color:colors.text,fontSize:24,fontWeight:'900',lineHeight:32,textAlign:'right'},
  muted:{color:colors.muted,fontSize:14,lineHeight:22,textAlign:'right'},
  field:{minHeight:50,backgroundColor:'#fff',borderWidth:1,borderColor:'#d0d5dd',borderRadius:15,paddingHorizontal:14,paddingVertical:12,color:colors.text,textAlign:'right',fontSize:15},
  passwordWrap:{minHeight:50,backgroundColor:'#fff',borderWidth:1,borderColor:'#d0d5dd',borderRadius:15,flexDirection:'row',alignItems:'center',overflow:'hidden'},
  passwordInput:{flex:1,minHeight:48,paddingHorizontal:14,paddingVertical:12,color:colors.text,textAlign:'right',fontSize:15},
  passwordToggle:{paddingHorizontal:14,minHeight:48,justifyContent:'center'},
  passwordToggleText:{color:colors.primary,fontWeight:'900',fontSize:13},
  button:{minHeight:50,backgroundColor:colors.primary,paddingHorizontal:14,paddingVertical:13,borderRadius:15,alignItems:'center',justifyContent:'center',shadowColor:'#e85d0f',shadowOpacity:0.16,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:2},
  buttonPressed:{transform:[{scale:0.985}],opacity:0.92},
  disabled:{opacity:0.45,shadowOpacity:0},
  buttonText:{color:'#fff',fontWeight:'900',fontSize:15,textAlign:'center'},
});
