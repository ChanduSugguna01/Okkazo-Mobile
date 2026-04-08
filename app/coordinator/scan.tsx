import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { verifyTicketQr } from "@/src/services/events";
import { palette } from "@/src/theme/palette";
import { QrVerificationResult } from "@/src/types/events";

const parseTokenFromQr = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed) as { token?: string; qrToken?: string; qrPayload?: string };
    return parsed.token ?? parsed.qrToken ?? parsed.qrPayload ?? trimmed;
  } catch {
    return trimmed;
  }
};

export default function QrScannerPage() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [isVerifying, setIsVerifying] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<QrVerificationResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const expectedEventId = useMemo(() => {
    if (!eventId) {
      return "";
    }

    return Array.isArray(eventId) ? eventId[0] : eventId;
  }, [eventId]);

  if (!session) {
    return <Redirect href="/login" />;
  }

  const runVerification = async (rawValue: string) => {
    const token = parseTokenFromQr(rawValue);
    if (!token) {
      setScanError("QR token is empty.");
      return;
    }

    try {
      setIsVerifying(true);
      setScanError(null);
      setWarning(null);
      const verification = await verifyTicketQr(session.accessToken, token);
      setResult(verification);
      setHasScanned(true);

      if (expectedEventId && verification.eventId !== expectedEventId) {
        setWarning(
          `Scanned ticket belongs to a different event (${verification.eventId}). Expected ${expectedEventId}.`
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ticket verification failed";
      setScanError(message);
      setHasScanned(true);
      setResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBarcodeScanned = async (scan: BarcodeScanningResult) => {
    if (hasScanned || isVerifying) {
      return;
    }

    await runVerification(scan.data);
  };

  const resetScanner = () => {
    setHasScanned(false);
    setResult(null);
    setScanError(null);
    setWarning(null);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Back</Text>
        </Pressable>

        <Text style={styles.title}>Scan Ticket QR</Text>
        <Text style={styles.subtitle}>Point the camera at attendee ticket QR to verify entries.</Text>

        {permission?.granted ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
            />
          </View>
        ) : (
          <View style={styles.permissionCard}>
            <Text style={styles.permissionText}>Camera access is required for QR scanning.</Text>
            <Pressable onPress={requestPermission} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.manualWrap}>
          <Text style={styles.manualLabel}>Or paste QR token manually</Text>
          <TextInput
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Paste QR token"
            placeholderTextColor="#64748b"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => runVerification(manualToken)}
            style={styles.secondaryButton}
            disabled={isVerifying}
          >
            <Text style={styles.secondaryButtonText}>Verify Token</Text>
          </Pressable>
        </View>

        {isVerifying ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={palette.main} />
            <Text style={styles.loadingText}>Verifying ticket...</Text>
          </View>
        ) : null}

        {scanError ? <Text style={styles.errorText}>{scanError}</Text> : null}
        {warning ? <Text style={styles.warningText}>{warning}</Text> : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Ticket Verified</Text>
            <Text style={styles.resultLine}>Event: {result.eventTitle}</Text>
            <Text style={styles.resultLine}>Ticket ID: {result.ticketId}</Text>
            <Text style={styles.resultLine}>Quantity: {result.quantity}</Text>
            <Text style={styles.resultLine}>Status: {result.ticketStatus}</Text>
            <Text style={styles.resultLine}>Scanned At: {new Date(result.scannedAt).toLocaleString()}</Text>

            <View style={styles.tiersWrap}>
              <Text style={styles.tierHeading}>Ticket Tiers</Text>
              {result.tiers.length === 0 ? (
                <Text style={styles.resultLine}>No tier breakdown provided.</Text>
              ) : (
                result.tiers.map((tier, index) => (
                  <Text key={`${tier.name}-${index}`} style={styles.resultLine}>
                    {tier.name}: {tier.noOfTickets} tickets
                  </Text>
                ))
              )}
            </View>
          </View>
        ) : null}

        <Pressable onPress={resetScanner} style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Scan Another Ticket</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.secondary,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 30,
  },
  backLink: {
    color: palette.main,
    fontSize: 14,
    fontWeight: "700",
  },
  title: {
    color: palette.main,
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  cameraWrap: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: palette.border,
    height: 340,
    backgroundColor: palette.main,
  },
  camera: {
    flex: 1,
  },
  permissionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 10,
  },
  permissionText: {
    color: palette.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: palette.main,
    alignItems: "center",
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  manualWrap: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 14,
    gap: 10,
  },
  manualLabel: {
    color: palette.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: palette.textPrimary,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.accent,
    alignItems: "center",
    paddingVertical: 11,
  },
  secondaryButtonText: {
    color: palette.accent,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: palette.textPrimary,
    fontSize: 13,
  },
  errorText: {
    color: palette.danger,
    fontSize: 13,
    lineHeight: 19,
  },
  warningText: {
    color: "#92400e",
    backgroundColor: "#ffedd5",
    borderRadius: 8,
    padding: 9,
    fontSize: 12,
    lineHeight: 18,
  },
  resultCard: {
    borderRadius: 14,
    backgroundColor: "#e8f7fb",
    borderWidth: 1,
    borderColor: "#9ad6e5",
    padding: 14,
    gap: 6,
  },
  resultTitle: {
    color: palette.accent,
    fontSize: 18,
    fontWeight: "800",
  },
  resultLine: {
    color: palette.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  tiersWrap: {
    marginTop: 8,
    gap: 4,
  },
  tierHeading: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  outlineButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    paddingVertical: 11,
    backgroundColor: palette.surface,
  },
  outlineButtonText: {
    color: palette.main,
    fontWeight: "700",
    fontSize: 14,
  },
});
