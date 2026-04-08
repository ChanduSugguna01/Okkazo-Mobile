import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
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
import { palette } from "@/src/theme/palette";

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
    <LinearGradient colors={["#042498", "#05329F", "#035C72"]} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.headerWrap}>
          <Image 
            source={require("../assets/images/Splash.png")} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.subtitle}>Sign in to continue to your workspace.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor="#64748b"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor="#64748b"
            secureTextEntry
            autoCapitalize="none"
            style={styles.input}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Pressable
            onPress={handleEmailLogin}
            disabled={!canSubmit}
            style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Login with Email</Text>
            )}
          </Pressable>

          <View style={styles.dividerWrap}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 28,
  },
  headerWrap: {
    gap: 8,
  },
  logo: {
    width: 240,
    height: 80,
    alignSelf: "flex-start",
  },
  subtitle: {
    color: "#dbe3ff",
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  inputLabel: {
    color: palette.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.textPrimary,
    fontSize: 15,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: palette.main,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  dividerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.border,
  },
  dividerText: {
    color: palette.textMuted,
    fontSize: 13,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.accent,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: palette.secondary,
  },
  secondaryButtonText: {
    color: palette.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.55,
  },
  helperText: {
    color: palette.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
