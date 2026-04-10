import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GOOGLE_CLIENT_IDS, hasGoogleClientConfig } from "@/src/config/env";
import { useAuth } from "@/src/providers/AuthProvider";

WebBrowser.maybeCompleteAuthSession();

const isBlank = (value: string) => value.trim().length === 0;

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CLIENT_IDS.expoClientId,
    androidClientId: GOOGLE_CLIENT_IDS.androidClientId,
    iosClientId: GOOGLE_CLIENT_IDS.iosClientId,
    webClientId: GOOGLE_CLIENT_IDS.webClientId,
    scopes: ["openid", "profile", "email"],
  } as never);

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type !== "success") {
        return;
      }

      const authToken =
        response.authentication?.accessToken ??
        (typeof response.params?.access_token === "string" ? response.params.access_token : undefined);

      if (!authToken) {
        setError("Google token was not returned. Try again.");
        return;
      }

      try {
        setIsSubmitting(true);
        setError(null);
        await signInWithGoogle(authToken);
        router.replace("/");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Google sign-in failed";
        setError(message);
      } finally {
        setIsSubmitting(false);
      }
    };

    handleGoogleResponse();
  }, [response, signInWithGoogle]);

  const canSubmit = useMemo(() => {
    return !isSubmitting && !isBlank(email) && !isBlank(password);
  }, [email, password, isSubmitting]);

  const handleEmailLogin = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await signInWithEmail(email, password);
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!request || !hasGoogleClientConfig || isSubmitting) {
      return;
    }

    setError(null);
    await promptAsync();
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerWrap}>
          <Image
            source={require("../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue to your workspace.</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@company.com"
              placeholderTextColor="#8c90a0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor="#8c90a0"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleEmailLogin}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.disabledButton,
              pressed && styles.primaryButtonPressed
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#002c72" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={!request || !hasGoogleClientConfig || isSubmitting}
            style={[
              styles.secondaryButton,
              (!request || !hasGoogleClientConfig || isSubmitting) && styles.disabledButton,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Sign in with Google</Text>
          </Pressable>

          {!hasGoogleClientConfig ? (
            <Text style={styles.helperText}>
              Set EXPO_PUBLIC_GOOGLE_* client IDs to enable Google sign-in.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0f131f",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
    gap: 32,
  },
  headerWrap: {
    gap: 12,
    alignItems: "center",
  },
  logo: {
    width: 260,
    height: 100,
    marginBottom: 16,
  },
  title: {
    color: "#dfe2f3",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#c2c6d7",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    backgroundColor: "rgba(27, 31, 44, 0.7)",
    borderRadius: 24,
    padding: 24,
    gap: 20,
    borderWidth: 1,
    borderColor: "rgba(66, 70, 84, 0.15)",
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: "#dfe2f3",
    fontWeight: "600",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#313442",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#dfe2f3",
    fontSize: 15,
  },
  errorText: {
    color: "#ffb4ab",
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 999,
    backgroundColor: "#b1c5ff",
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#b1c5ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryButtonPressed: {
    backgroundColor: "#5a8cff",
  },
  primaryButtonText: {
    color: "#002c72",
    fontWeight: "700",
    fontSize: 16,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(66, 70, 84, 0.3)",
  },
  dividerText: {
    color: "#c2c6d7",
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(66, 70, 84, 0.3)",
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#0a0e1a",
  },
  secondaryButtonText: {
    color: "#dfe2f3",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  helperText: {
    color: "#c2c6d7",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    textAlign: "center",
  },
});
