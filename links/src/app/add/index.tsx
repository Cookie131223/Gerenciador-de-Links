import { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { styles } from "./style";
import { colors } from "@/styles/colors";

import{Categories}  from "@/components/categories";
import { Button } from "@/components/button";
import { Input } from "@/components/input";



export default function Add() {


const [category,setCategory ] = useState("");
const [name,setName ] = useState("");
const [url,setUrl ] = useState("");


function handleAdd() {

if(!category ) {
    return Alert.alert("Categoria", "Selecione uma categoria");

}

if(!name.trim()) {
    return Alert.alert("Nome", "Informe o nome do link");

}

if(!url.trim()) {
    return Alert.alert("URL", "Informe a URL do link");

}

    console.log(name,url, category);
}


  return (
<View style={styles.container}>
    <View style={styles.header}>
<TouchableOpacity onPress={() => router.back()}>
    <MaterialIcons name="arrow-back" size={32} color={colors.gray[200]} />
</TouchableOpacity>

<Text style={styles.title}>Novo</Text>
    </View>

    <Text style={styles.label}>Selecione uma categoria</Text>
    <Categories onChange={setCategory} selected={category} />


    <View style={styles.form}>
<Input placeholder="Nome" onChangeText={setName} autoCorrect={false} />
<Input placeholder="URL" onChangeText={setUrl} autoCorrect={false} />
<Button title="Adicionar" onPress={handleAdd} />
</View>


    </View>
  )

}