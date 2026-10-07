import { useEffect, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";

import { styles } from "./style";
import { colors } from "@/styles/colors";
import { authStorage } from "@/storage/auth-storage";
import { cloudLinkStorage } from "@/storage/cloud-link-storage";

import { Categories } from "@/components/categories";
import { Button } from "@/components/button";
import { Input } from "@/components/input";

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function Add() {
  const params = useLocalSearchParams<{
    id?: string;
    name?: string;
    url?: string;
    category?: string;
  }>();

  const editing = Boolean(params.id);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.id) {
      setCategory(params.category || "");
      setName(params.name || "");
      setUrl(params.url || "");
    }
  }, [params.id]);

  async function handleSave() {
    if (!category) {
      return Alert.alert("Categoria", "Selecione uma categoria.");
    }

    if (!name.trim()) {
      return Alert.alert("Nome", "Informe o nome do link.");
    }

    if (!url.trim()) {
      return Alert.alert("URL", "Informe a URL do link.");
    }

    try {
      setLoading(true);
      const session = await authStorage.getValid();

      if (!session) {
        router.replace("/login");
        return;
      }

      const data = {
        name: name.trim(),
        url: normalizeUrl(url),
        category,
      };

      if (editing && params.id) {
        await cloudLinkStorage.update(session.access_token, params.id, data);
      } else {
        await cloudLinkStorage.save(session.access_token, session.user.id, data);
      }

      Alert.alert("Sucesso", editing ? "Link atualizado com sucesso!" : "Link adicionado com sucesso!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível salvar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={32} color={colors.gray[200]} />
        </TouchableOpacity>

        <Text style={styles.title}>{editing ? "Editar" : "Novo"}</Text>
      </View>

      <Text style={styles.label}>Selecione uma categoria</Text>
      <Categories onChange={setCategory} selected={category} />

      <View style={styles.form}>
        <Input placeholder="Nome" value={name} onChangeText={setName} autoCorrect={false} />
        <Input
          placeholder="URL"
          value={url}
          onChangeText={setUrl}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Button
          title={loading ? "Salvando..." : editing ? "Salvar alterações" : "Adicionar"}
          onPress={handleSave}
          disabled={loading}
        />
      </View>
    </View>
  );
}
