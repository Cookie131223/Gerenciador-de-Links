import { useState } from "react";
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { colors } from "@/styles/colors";
import { signIn, signUp } from "@/lib/supabase-api";
import { authStorage } from "@/storage/auth-storage";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return Alert.alert("Atenção", "Informe e-mail e senha.");
    }

    if (password.length < 6) {
      return Alert.alert("Senha", "Use pelo menos 6 caracteres.");
    }

    try {
      setLoading(true);

      if (isRegister) {
        const session = await signUp(normalizedEmail, password);

        if (!session) {
          Alert.alert("Conta criada", "Confira seu e-mail para confirmar o cadastro e depois faça login.");
          setIsRegister(false);
          return;
        }

        await authStorage.save(session);
      } else {
        const session = await signIn(normalizedEmail, password);
        await authStorage.save(session);
      }

      router.replace("/");
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require("@/assets/logo.png")} style={styles.logo} />
      <Text style={styles.title}>Gerenciador de Links</Text>
      <Text style={styles.subtitle}>
        {isRegister ? "Crie sua conta para sincronizar seus links." : "Entre para acessar seus links em qualquer dispositivo."}
      </Text>

      <View style={styles.form}>
        <Input
          placeholder="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          placeholder="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
        <Button title={loading ? "Aguarde..." : isRegister ? "Criar conta" : "Entrar"} onPress={handleSubmit} disabled={loading} />
      </View>

      <TouchableOpacity onPress={() => setIsRegister((value) => !value)}>
        <Text style={styles.switchText}>
          {isRegister ? "Já tem uma conta? Entrar" : "Ainda não tem conta? Criar conta"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[950],
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 54,
    height: 46,
    marginBottom: 24,
  },
  title: {
    color: colors.gray[100],
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    color: colors.gray[400],
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 28,
  },
  form: {
    gap: 14,
    marginBottom: 22,
  },
  switchText: {
    color: colors.green[300],
    textAlign: "center",
    fontWeight: "600",
  },
});
