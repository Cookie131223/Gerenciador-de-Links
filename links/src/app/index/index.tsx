import{useState, useCallback, use} from "react";
import { View, Image, TouchableOpacity, FlatList, Modal, Text, Alert, Platform, Linking } from 'react-native';
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
  const [showModal, setShowModal] = useState(false);
  const [link, setLink] = useState<LinkStorage>({} as LinkStorage);
  const [links, setLinks] = useState<LinkStorage[]>([]);
const [category,setCategory ] = useState(categories[0].name);

async function getLinks(){
  try {
    const response = await linkStorage.get();

const filteredLinks = response.filter((link) => link.category === category);

    
    setLinks(filteredLinks);
  }catch(error) {
    Alert.alert("Erro", "Não foi possível carregar os links");
}
}

function handleDetails(selected: LinkStorage) {
  console.log("Link selecionado para exclusão:", selected); // Adicione isso
  setLink(selected);
  setShowModal(true);
}

async function linkRemove() {
  try {
    await linkStorage.remove(link.id);
    
    // 1. Fecha o modal/menu
    setShowModal(false); 
    
    // 2. Atualiza a lista na tela chamando sua função de busca novamente
    await getLinks(); 
    
    console.log("Link removido e lista atualizada!");
  } catch (error) {
    console.log("Erro ao remover:", error);
  }
}

function handleRemove() {
  if (Platform.OS === 'web') {
    // Se estiver no navegador (localhost)
    if (window.confirm("Deseja realmente excluir este link?")) {
      linkRemove();
    }
  } else {
    // Se estiver no Android ou iOS (celular real/emulador)
    Alert.alert("Excluir", "Deseja excluir este link?", [
      { style: "cancel", text: "Não" },
      { text: "Sim", onPress: linkRemove },
    ]);
  }
}

async function handleOpen(){
  try{
    await Linking.openURL(link.url);
    setShowModal(false);
  } catch(error){
    Alert.alert("Erro", "Não foi possível abrir o link");
  }
}



useFocusEffect(
  useCallback(() => {
    getLinks();
  }, [category])
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
    onDetails={() => handleDetails(item)} 
    />
  )}
    


    style={styles.links}
    contentContainerStyle={styles.linksContent}
    showsVerticalScrollIndicator  ={false}

    />
    <Modal transparent visible={showModal} animationType="slide">
<View style={styles.modal}>
  <View style={styles.modalContent}>
<View style={styles.modalHeader}>
<Text style={styles.modalcategory}>{link.category}</Text>
<TouchableOpacity onPress={() => setShowModal(false)}>
<MaterialIcons name="close" size={24} color={colors.gray[400]} />
</TouchableOpacity>
</View>
<Text style={styles.modalLinkName}>{link.name}</Text>
<Text style={styles.modalUrl}>{link.url}</Text>
<View style = {styles.modalFooter}>
  <Option name= "Excluir" icon="delete" variant="secondary" onPress={handleRemove} />
   <Option name= "Abrir" icon="language" onPress={handleOpen}/>
</View>
  </View>

</View>

    </Modal>
    </View>
  )
}



