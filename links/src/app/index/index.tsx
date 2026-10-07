import { useCallback, useState } from "react";
import { Alert, FlatList, Image, Linking, Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { styles } from "./styles";
import { colors } from "@/styles/colors";
import { authStorage } from "@/storage/auth-storage";
import { cloudLinkStorage, CloudLink } from "@/storage/cloud-link-storage";

import { Link } from "@/components/link";
import { Option } from "@/components/option";
import { Categories } from "@/components/categories";
import { categories } from "@/utils/categories";

export default function Index() {
  const [showModal, setShowModal] = useState(false);
  const [link, setLink] = useState<CloudLink>({} as CloudLink);
  const [links, setLinks] = useState<CloudLink[]>([]);
  const [category, setCategory] = useState(categories[0].name);
  const [email, setEmail] = useState("");

  async function getSessionOrRedirect() {
    const session = await authStorage.getValid();

    if (!session) {
      router.replace("/login");
      return null;
    }

    setEmail(session.user.email || "");
    return session;
  }

  async function getLinks() {
    try {
      const session = await getSessionOrRedirect();
      if (!session) return;

      const response = await cloudLinkStorage.get(session.access_token, category);
      setLinks(response);
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível carregar os links.");
    }
  }

  function handleDetails(selected: CloudLink) {
    setLink(selected);
    setShowModal(true);
  }

  async function linkRemove() {
    try {
      const session = await getSessionOrRedirect();
      if (!session) return;

      await cloudLinkStorage.remove(session.access_token, link.id);
      setShowModal(false);
      await getLinks();
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível excluir o link.");
    }
  }

  function handleRemove() {
    if (Platform.OS === "web") {
      if (window.confirm("Deseja realmente excluir este link?")) {
        linkRemove();
      }
    } else {
      Alert.alert("Excluir", "Deseja excluir este link?", [
        { style: "cancel", text: "Não" },
        { text: "Sim", onPress: linkRemove },
      ]);
    }
  }

  async function handleOpen() {
    try {
      await Linking.openURL(link.url);
      setShowModal(false);
    } catch {
      Alert.alert("Erro", "Não foi possível abrir o link.");
    }
  }

  function handleEdit() {
    setShowModal(false);
    router.push({
      pathname: "/add",
      params: {
        id: link.id,
        name: link.name,
        url: link.url,
        category: link.category,
      },
    });
  }

  async function handleLogout() {
    await authStorage.logout();
    router.replace("/login");
  }

  useFocusEffect(
    useCallback(() => {
      getLinks();
    }, [category])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Image source={require("@/assets/logo.png")} style={styles.logo} />
          {!!email && <Text style={{ color: colors.gray[500], fontSize: 11, marginTop: 6 }}>{email}</Text>}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <TouchableOpacity onPress={handleLogout}>
            <MaterialIcons name="logout" size={25} color={colors.gray[400]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/add")}>
            <MaterialIcons name="add" size={32} color={colors.green[300]} />
          </TouchableOpacity>
        </View>
      </View>

      <Categories onChange={setCategory} selected={category} />

      <FlatList
        data={links}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link name={item.name} url={item.url} onDetails={() => handleDetails(item)} />
        )}
        style={styles.links}
        contentContainerStyle={styles.linksContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ color: colors.gray[500], textAlign: "center", marginTop: 32 }}>
            Nenhum link nesta categoria.
          </Text>
        }
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

            <View style={styles.modalFooter}>
              <Option name="Excluir" icon="delete" variant="secondary" onPress={handleRemove} />
              <Option name="Editar" icon="edit" onPress={handleEdit} />
              <Option name="Abrir" icon="language" onPress={handleOpen} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
