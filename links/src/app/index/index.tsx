import{useState, useCallback, use} from "react";
import { View, Image, TouchableOpacity, FlatList, Modal, Text, Alert } from 'react-native';
import { MaterialIcons} from '@expo/vector-icons';
import { router, Router, useFocusEffect } from 'expo-router';

import { styles } from './styles';
import { colors } from '@/styles/colors';
import { linkStorage, LinkStorage} from "@/storage/link-storage";

import { Link } from '@/components/link';
import { Option } from '@/components/option';
import { Categories } from '@/components/categories';
import { categories } from '@/utils/categories';



export default function Index() {
  const [links, setLinks] = useState<LinkStorage[]>([]);
const [category,setCategory ] = useState(categories[0].name);

async function getLinks(){
  try {
    const response = await linkStorage.get();
    setLinks(response);

  }catch(error) {
    Alert.alert("Erro", "Não foi possível carregar os links");
}
}

useFocusEffect(
  useCallback(() => {
    getLinks();
  }, [])
)

  return (
    <View style={styles.container}>
      <View style={styles.header}>
<Image source={require("@/assets/logo.png")} style={styles.logo} />

<TouchableOpacity onPress={() => router.navigate("/add")}>
  <MaterialIcons name="add" size={32} color={colors.green[300]} />
</TouchableOpacity>
      </View>

      <Categories onChange={setCategory} selected={category} />
      
    <FlatList 
    data={links}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => ( 
    <Link 
    name={item.name} 
    url={item.url} 
    onDetails={() => console.log("Clicou!")} 
    />
  )}
    


    style={styles.links}
    contentContainerStyle={styles.linksContent}
    showsVerticalScrollIndicator  ={false}

    />
    <Modal transparent visible={false}>
<View style={styles.modal}>
  <View style={styles.modalContent}>
<View style={styles.modalHeader}>
<Text style={styles.modalcategory}>Curso</Text>S
<TouchableOpacity>
<MaterialIcons name="close" size={24} color={colors.gray[400]} />
</TouchableOpacity>
</View>
<Text style={styles.modalLinkName}>Rocketseat</Text>
<Text style={styles.modalUrl}>https://rocketseat.com.br</Text>
<View style = {styles.modalFooter}>
  <Option name= "Excluir" icon="delete" variant="secondary" />
   <Option name= "Abrir" icon="language"/>
</View>
  </View>

</View>

    </Modal>
    </View>
  )
}



