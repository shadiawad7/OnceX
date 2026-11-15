import { Modal, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button';
import type { FederationGroupBrowserProps } from './FederationGroupBrowser.types';
/** Web keeps manual opponents: the federation's DOM cannot be read across origins. */
export default function FederationGroupBrowser({onClose}:FederationGroupBrowserProps){
 return <Modal visible onRequestClose={onClose}><SafeAreaView style={styles.safe}><View style={styles.content}><Text style={styles.text}>La vinculación con la FFCV está disponible desde ONCEX en iPhone y Android. En web puedes escribir el rival manualmente.</Text><Button label="VOLVER" onPress={onClose}/></View></SafeAreaView></Modal>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#090B10'},content:{flex:1,justifyContent:'center',padding:24,gap:20},text:{color:'#FFF',fontSize:16,lineHeight:24}});
