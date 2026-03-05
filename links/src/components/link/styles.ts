import { StyleSheet } from "react-native";
import { colors } from "@/styles/colors";


export const styles = StyleSheet.create({
container:{
flexDirection:"row",
alignItems:"center",
gap:12,
width:"100%",
},

details:{
    flex:1,
},
name:{
    color: colors.gray[100],
    fontSize: 16,
fontWeight: "600"
},
url:{
color: colors.gray[300],
fontSize: 14,
},
})