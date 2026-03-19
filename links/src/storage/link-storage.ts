import AsyncStorage from '@react-native-async-storage/async-storage';


const LINKS_STORAGE_KEY = "links-storage";

 export type LinkStorage = {
    id: string
    name: string
    url: string
    category: string
}

async function  get(): Promise<LinkStorage[]> {
const storage = await AsyncStorage.getItem(LINKS_STORAGE_KEY);
const response = storage ? JSON.parse(storage) : [];

return response
}

async function save(newLink: LinkStorage){
try {
    const storage = await get()
    const updated = JSON.stringify( [...storage,newLink])

    await AsyncStorage.setItem(LINKS_STORAGE_KEY, updated);


} catch(error){
    throw error
}

}


async function remove(id: string) {
  try {
    const storage = await get();
    console.log("Storage antes da exclusão:", storage.length, "itens");
    
    // Força a comparação como String para evitar erro de tipo
    const updated = storage.filter((link) => String(link.id) !== String(id));
    
    console.log("Storage após o filtro:", updated.length, "itens");

    await AsyncStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(updated));
    console.log("AsyncStorage atualizado com sucesso!");
  } catch (error) {
    throw error;
  }
}


export const linkStorage = {get,save,remove}