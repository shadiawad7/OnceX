import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { loadPlayerEvolution, monthlyOvrPoints, type OvrSnapshot } from '../lib/playerEvolution';

export default function PlayerEvolution({playerId}:{playerId:string}){
 const [snapshots,setSnapshots]=useState<OvrSnapshot[]>([]);
 useFocusEffect(useCallback(()=>{
  let active=true;setSnapshots([]);
  void loadPlayerEvolution(playerId).then(data=>{if(active)setSnapshots(monthlyOvrPoints(data.snapshots));}).catch(()=>{});
  return()=>{active=false;};
 },[playerId]));
 const width=320,height=86;
 const x=(index:number,count:number)=>count===1?width/2:24+index*(width-48)/(count-1);
 const points=snapshots.length?snapshots.map((snapshot,index)=>({x:x(index,snapshots.length),y:height-18-snapshot.overall/99*(height-36)})):Array.from({length:5},(_,index)=>({x:x(index,5),y:height/2}));
 return <View style={styles.section}>
  <Text style={styles.title}>EVOLUCIÓN</Text>
  <View accessible accessibilityLabel={snapshots.length?'Evolución mensual del jugador':'Guía visual de evolución, todavía sin datos mensuales'} style={styles.chart}>
   <Svg pointerEvents="none" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
    {points.slice(1).map((point,index)=><Line key={`line-${index}`} x1={points[index].x} y1={points[index].y} x2={point.x} y2={point.y} stroke="#E82E50" strokeOpacity={0.5} strokeWidth={1.5}/>)}
    {points.map((point,index)=><Circle key={`point-${index}`} cx={point.x} cy={point.y} r={4} fill="#FF4866" stroke="#66172B" strokeWidth={2}/>)}
   </Svg>
  </View>
 </View>;
}
const styles=StyleSheet.create({section:{marginBottom:24},title:{color:'#FFFFFF',fontSize:12,fontWeight:'900',letterSpacing:1.2,marginBottom:12},chart:{borderRadius:14,borderWidth:1,borderColor:'rgba(255,80,102,0.2)',backgroundColor:'rgba(12,12,18,0.4)',paddingHorizontal:8}});
