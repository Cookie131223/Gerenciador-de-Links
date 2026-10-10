import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { colors } from "@/styles/colors";
import { authStorage } from "@/storage/auth-storage";
import { cloudNoteStorage, CloudNote } from "@/storage/cloud-note-storage";
import { Input } from "@/components/input";
import { Button } from "@/components/button";

const noteCategories = ["Pessoal", "Trabalho", "Faculdade", "Ideias"];

export default function Notes() {
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [query, setQuery] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CloudNote | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(noteCategories[0]);
  const [pinned, setPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sessionOrRedirect() {
    const session = await authStorage.getValid();
    if (!session) {
      router.replace("/login");
      return null;
    }
    return session;
  }

  async function loadNotes() {
    try {
      const session = await sessionOrRedirect();
      if (!session) return;
      setNotes(await cloudNoteStorage.get(session.access_token));
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível carregar as anotações.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [])
  );

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase();
    if (!text) return notes;

    return notes.filter((note) =>
      [note.title, note.content, note.category].some((value) =>
        value.toLowerCase().includes(text)
      )
    );
  }, [notes, query]);

  function openNew() {
    setEditing(null);
    setTitle("");
    setContent("");
    setCategory(noteCategories[0]);
    setPinned(false);
    setEditorOpen(true);
  }

  function openEdit(note: CloudNote) {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setPinned(note.pinned);
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!title.trim()) {
      return Alert.alert("Título", "Digite um título para a anotação.");
    }

    try {
      setLoading(true);
      const session = await sessionOrRedirect();
      if (!session) return;

      const data = {
        title: title.trim(),
        content: content.trim(),
        category,
        pinned,
      };

      if (editing) {
        await cloudNoteStorage.update(session.access_token, editing.id, data);
      } else {
        await cloudNoteStorage.save(session.access_token, session.user.id, data);
      }

      setEditorOpen(false);
      await loadNotes();
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível salvar a anotação.");
    } finally {
      setLoading(false);
    }
  }

  async function togglePin(note: CloudNote) {
    try {
      const session = await sessionOrRedirect();
      if (!session) return;
      await cloudNoteStorage.update(session.access_token, note.id, { pinned: !note.pinned });
      await loadNotes();
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível fixar a anotação.");
    }
  }

  async function removeNote(note: CloudNote) {
    const remove = async () => {
      const session = await sessionOrRedirect();
      if (!session) return;
      await cloudNoteStorage.remove(session.access_token, note.id);
      await loadNotes();
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Excluir "${note.title}"?`)) await remove();
      return;
    }

    Alert.alert("Excluir anotação", `Deseja excluir "${note.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: remove },
    ]);
  }

  async function copyNote(note: CloudNote) {
    const text = note.content ? `${note.title}\n\n${note.content}` : note.title;

    try {
      if (Platform.OS === "web" && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        Alert.alert("Copiado", "Anotação copiada.");
      } else {
        Alert.alert("Copiar", "No celular, selecione o texto da anotação para copiar.");
      }
    } catch {
      Alert.alert("Erro", "Não foi possível copiar a anotação.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Meu Hub</Text>
          <Text style={styles.subtitle}>Suas anotações sincronizadas</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openNew}>
          <MaterialIcons name="add" size={28} color={colors.gray[950]} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => router.replace("/")}>
          <MaterialIcons name="link" size={19} color={colors.gray[400]} />
          <Text style={styles.tabText}>Links</Text>
        </TouchableOpacity>
        <View style={[styles.tab, styles.tabActive]}>
          <MaterialIcons name="description" size={19} color={colors.green[300]} />
          <Text style={styles.tabTextActive}>Anotações</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={22} color={colors.gray[500]} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar nas anotações..."
          placeholderTextColor={colors.gray[500]}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="sticky-note-2" size={42} color={colors.gray[600]} />
            <Text style={styles.emptyTitle}>{query ? "Nada encontrado" : "Nenhuma anotação ainda"}</Text>
            <Text style={styles.emptyText}>
              {query ? "Tente buscar por outra palavra." : "Crie sua primeira nota e pare de depender das conversas do WhatsApp."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} style={styles.noteCard} onPress={() => openEdit(item)}>
            <View style={styles.noteTop}>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
              <TouchableOpacity onPress={() => togglePin(item)} hitSlop={8}>
                <MaterialIcons
                  name={item.pinned ? "push-pin" : "push-pin"}
                  size={20}
                  color={item.pinned ? colors.green[300] : colors.gray[600]}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteTitle}>{item.title}</Text>
            {!!item.content && (
              <Text numberOfLines={4} style={styles.noteContent}>{item.content}</Text>
            )}

            <View style={styles.noteActions}>
              <TouchableOpacity style={styles.iconAction} onPress={() => copyNote(item)}>
                <MaterialIcons name="content-copy" size={18} color={colors.gray[400]} />
                <Text style={styles.actionText}>Copiar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconAction} onPress={() => removeNote(item)}>
                <MaterialIcons name="delete-outline" size={19} color={colors.gray[400]} />
                <Text style={styles.actionText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <TouchableOpacity onPress={() => setEditorOpen(false)}>
              <MaterialIcons name="close" size={28} color={colors.gray[300]} />
            </TouchableOpacity>
            <Text style={styles.editorTitle}>{editing ? "Editar anotação" : "Nova anotação"}</Text>
            <TouchableOpacity onPress={() => setPinned((value) => !value)}>
              <MaterialIcons name="push-pin" size={24} color={pinned ? colors.green[300] : colors.gray[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.editorBody} keyboardShouldPersistTaps="handled">
            <Input
              placeholder="Título"
              value={title}
              onChangeText={setTitle}
              maxLength={140}
            />

            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Escreva aqui... ideias, lembretes, textos, informações do trabalho..."
              placeholderTextColor={colors.gray[500]}
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.categories}>
              {noteCategories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[styles.choice, category === item && styles.choiceActive]}
                  onPress={() => setCategory(item)}
                >
                  <Text style={[styles.choiceText, category === item && styles.choiceTextActive]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button
              title={loading ? "Salvando..." : editing ? "Salvar alterações" : "Salvar anotação"}
              onPress={handleSave}
              disabled={loading}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[950], paddingTop: 60 },
  header: { paddingHorizontal: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
  title: { color: colors.gray[100], fontSize: 27, fontWeight: "700" },
  subtitle: { color: colors.gray[500], fontSize: 13, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.green[300], alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", marginHorizontal: 24, marginBottom: 18, backgroundColor: colors.gray[900], padding: 5, borderRadius: 14 },
  tab: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: colors.gray[800] },
  tabText: { color: colors.gray[400], fontWeight: "600" },
  tabTextActive: { color: colors.green[300], fontWeight: "700" },
  searchWrap: { marginHorizontal: 24, marginBottom: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.gray[800], backgroundColor: colors.gray[900], borderRadius: 12, paddingHorizontal: 13 },
  search: { flex: 1, color: colors.gray[100], minHeight: 46, paddingHorizontal: 10, outlineStyle: "none" } as any,
  list: { padding: 24, gap: 14, paddingBottom: 90 },
  noteCard: { backgroundColor: colors.gray[900], borderWidth: 1, borderColor: colors.gray[800], borderRadius: 16, padding: 18 },
  noteTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  categoryChip: { backgroundColor: colors.green[900], paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999 },
  categoryText: { color: colors.green[300], fontSize: 11, fontWeight: "700" },
  noteTitle: { color: colors.gray[100], fontSize: 18, fontWeight: "700", marginBottom: 7 },
  noteContent: { color: colors.gray[400], fontSize: 14, lineHeight: 21 },
  noteActions: { flexDirection: "row", gap: 18, borderTopWidth: 1, borderTopColor: colors.gray[800], paddingTop: 13, marginTop: 16 },
  iconAction: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionText: { color: colors.gray[400], fontSize: 12 },
  empty: { alignItems: "center", paddingTop: 70, paddingHorizontal: 28 },
  emptyTitle: { color: colors.gray[300], fontSize: 18, fontWeight: "700", marginTop: 14 },
  emptyText: { color: colors.gray[500], textAlign: "center", marginTop: 7, lineHeight: 20 },
  editor: { flex: 1, backgroundColor: colors.gray[950], paddingTop: 56 },
  editorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.gray[800] },
  editorTitle: { color: colors.gray[100], fontSize: 17, fontWeight: "700" },
  editorBody: { padding: 24, gap: 16 },
  textArea: { minHeight: 230, borderWidth: 1, borderColor: colors.gray[800], backgroundColor: colors.gray[900], color: colors.gray[100], borderRadius: 12, padding: 16, fontSize: 15, lineHeight: 23 },
  label: { color: colors.gray[400], fontSize: 13, fontWeight: "600", marginTop: 4 },
  categories: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginBottom: 8 },
  choice: { borderWidth: 1, borderColor: colors.gray[600], paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  choiceActive: { backgroundColor: colors.green[900], borderColor: colors.green[300] },
  choiceText: { color: colors.gray[400], fontSize: 13 },
  choiceTextActive: { color: colors.green[300], fontWeight: "700" },
});
