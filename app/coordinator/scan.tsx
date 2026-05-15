import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/src/providers/AuthProvider";
import { verifyTicketQr } from "@/src/services/events";
import { palette } from "@/src/theme/palette";
import { QrVerificationResult } from "@/src/types/events";

const parseTokenFromQr = (rawValue: string) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed) as { token?: string; qrToken?: string; qrPayload?: string };
    return parsed.token ?? parsed.qrToken ?? parsed.qrPayload ?? trimmed;
  } catch {
    return trimmed;
  }
};

const CAMERA_READY_TIMEOUT_MS = 4000;
const DUPLICATE_SCAN_WINDOW_MS = 1500;
const VIEWFINDER_PADDING = 40;
const SCAN_LINE_HEIGHT = 3;

export default function QrScannerPage() {
  const { top } = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [isVerifying, setIsVerifying] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraKey, setCameraKey] = useState(0);
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState<QrVerificationResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [viewfinderHeight, setViewfinderHeight] = useState(0);
  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ token: string; at: number } | null>(null);

  // Scan line animation
  const scanLineAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (permission?.granted && !hasScanned && viewfinderHeight > 0) {
      const travelDistance = Math.max(
        0,
        viewfinderHeight - VIEWFINDER_PADDING * 2 - SCAN_LINE_HEIGHT
      );
      scanLineAnim.setValue(0);
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: travelDistance,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [permission?.granted, hasScanned, scanLineAnim, viewfinderHeight]);

  useEffect(() => {
    if (!permission?.granted || cameraReady || cameraError) return;
    const timer = setTimeout(() => {
      setCameraError("Camera failed to start. Tap to retry.");
    }, CAMERA_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [permission?.granted, cameraReady, cameraError]);

  const expectedEventId = useMemo(() => {
    if (!eventId) return "";
    return Array.isArray(eventId) ? eventId[0] : eventId;
  }, [eventId]);

  if (!session) return <Redirect href="/login" />;

  const handleRequestPermission = async () => {
    setPermissionError(null);
    const next = await requestPermission();
    if (!next.granted) {
      setPermissionError("Camera permission is required to scan tickets.");
      return;
    }

    // Reset scan state so camera becomes active immediately after permission is granted.
    setHasScanned(false);
    setResult(null);
    setScanError(null);
    setWarning(null);
  };

  const runVerification = async (rawValue: string) => {
    const token = parseTokenFromQr(rawValue);
    if (!token) {
      setScanError("QR token is empty.");
      return;
    }

    if (scanLockRef.current) return;

    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.token === token && now - last.at < DUPLICATE_SCAN_WINDOW_MS) {
      return;
    }
    lastScanRef.current = { token, at: now };
    scanLockRef.current = true;

    try {
      setIsVerifying(true);
      setScanError(null);
      setWarning(null);
      const verification = await verifyTicketQr(session.accessToken, token);
      if (verification?.alreadyScanned) {
        setScanError("Ticket has already been scanned.");
        setResult(null);
        setHasScanned(true);
        return;
      }

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
      scanLockRef.current = false;
    }
  };

  const retryCamera = useCallback(() => {
    setCameraError(null);
    setCameraReady(false);
    setCameraKey((value) => value + 1);
  }, []);

  const handleBarcodeScanned = async (scan: BarcodeScanningResult) => {
    if (hasScanned || isVerifying) return;
    await runVerification(scan.data);
  };

  const resetScanner = () => {
    setHasScanned(false);
    setResult(null);
    setScanError(null);
    setWarning(null);
    setCameraError(null);
    setCameraReady(false);
    setManualToken("");
    lastScanRef.current = null;
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, styles.contentPadding, { paddingTop: Math.max(top, 32) + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={palette.main} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Scan Ticket</Text>
        <Text style={styles.subtitle}>Point the camera at attendee ticket QR to verify entries.</Text>
      </View>

      {permission?.granted ? (
        <View style={[styles.contentPadding, styles.cameraSection]}>
          <View style={styles.cameraContainer} collapsable={false}>
            <View style={styles.cameraFrame} collapsable={false}>
              <CameraView
                key={cameraKey}
                style={styles.camera}
                facing="back"
                active={!hasScanned}
                onCameraReady={() => {
                  setCameraReady(true);
                  setCameraError(null);
                }}
                onMountError={(error) =>
                  setCameraError(error?.message ?? "Unable to start the camera.")
                }
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
              />
              {!cameraReady && !cameraError ? (
                <View style={[styles.cameraOverlay, styles.cameraOverlayDim]}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.cameraLoadingText}>Starting camera…</Text>
                </View>
              ) : null}
              {cameraError ? (
                <Pressable onPress={retryCamera} style={[styles.cameraOverlay, styles.cameraOverlayDim]}>
                  <Text style={styles.permissionErrorText}>{cameraError}</Text>
                  <Text style={styles.cameraRetryText}>Tap to retry</Text>
                </Pressable>
              ) : null}
              {!hasScanned && (
                <View
                  style={styles.viewfinderOverlay}
                  onLayout={(event) => setViewfinderHeight(event.nativeEvent.layout.height)}
                >
                  <Animated.View 
                    style={[
                      styles.scanLine, 
                      { transform: [{ translateY: scanLineAnim }] }
                    ]} 
                  />
                  <View style={styles.cornerTopLeft} />
                  <View style={styles.cornerTopRight} />
                  <View style={styles.cornerBottomLeft} />
                  <View style={styles.cornerBottomRight} />
                </View>
              )}
              {hasScanned && (
                <View style={[styles.cameraOverlay, styles.cameraOverlayDim]}>
                   {isVerifying && <ActivityIndicator size="large" color="#ffffff" />}
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.contentPadding}>
          <View style={styles.glassCard}>
            <Ionicons name="camera" size={48} color={palette.textMuted} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.permissionText}>Camera access is required for QR scanning.</Text>
            {permissionError ? (
              <Text style={styles.permissionErrorText}>{permissionError}</Text>
            ) : null}
            <Pressable onPress={handleRequestPermission}>
              <LinearGradient
                colors={['#b1c5ff', '#5a8cff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Grant Camera Permission</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scrollContent, styles.contentPadding]}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        <View style={styles.glassCard}>
          <Text style={styles.manualLabel}>Manual Verification</Text>
          <TextInput
            value={manualToken}
            onChangeText={setManualToken}
            placeholder="Paste QR token"
            placeholderTextColor="rgba(223, 226, 243, 0.4)"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => runVerification(manualToken)}
            disabled={isVerifying || hasScanned}
          >
             <LinearGradient
                colors={isVerifying || hasScanned ? ['#3a485b', '#3a485b'] : ['#b1c5ff', '#5a8cff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{isVerifying ? 'Verifying...' : 'Verify Token'}</Text>
              </LinearGradient>
          </Pressable>
        </View>

        {scanError ? (
          <View style={[styles.feedbackCard, styles.errorCard]}>
             <Ionicons name="alert-circle" size={20} color={palette.danger} />
             <Text style={styles.errorText}>{scanError}</Text>
          </View>
        ) : null}

        {warning ? (
          <View style={[styles.feedbackCard, styles.warningCard]}>
             <Ionicons name="warning" size={20} color="#ffb68c" />
             <Text style={styles.warningText}>{warning}</Text>
          </View>
        ) : null}

        {result ? (
          <View style={[styles.glassCard, styles.resultCard]}>
            <View style={styles.resultHeader}>
              <Ionicons name="checkmark-circle" size={28} color={palette.success} />
              <Text style={styles.resultTitle}>Ticket Verified</Text>
            </View>
            
            <View style={styles.resultDetails}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Event</Text>
                <Text style={styles.resultValue}>{result.eventTitle}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Ticket ID</Text>
                <Text style={styles.resultValue}>{result.ticketId.slice(0, 12).toUpperCase()}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Quantity</Text>
                <Text style={styles.resultValue}>{result.quantity}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Status</Text>
                <Text style={[styles.resultValue, { color: palette.success, fontWeight: '800' }]}>{result.ticketStatus}</Text>
              </View>
            </View>

            <View style={styles.tierSection}>
               <Text style={styles.tierTitle}>Breakdown</Text>
               {result.tiers.map((tier, idx) => (
                 <View key={idx} style={styles.tierRow}>
                   <Text style={styles.tierName}>{tier.name}</Text>
                   <Text style={styles.tierCount}>{tier.noOfTickets} Tickets</Text>
                 </View>
               ))}
            </View>
          </View>
        ) : null}

        {hasScanned && (
          <Pressable onPress={resetScanner} style={styles.resetButton}>
            <Text style={styles.resetButtonText}>Scan Another Ticket</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f131f', // background
  },
  contentPadding: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 60,
    paddingTop: 20,
  },
  header: {
    gap: 8,
    marginBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
    marginBottom: 12,
  },
  backText: {
    color: palette.main,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#dfe2f3', // on-surface
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#c2c6d7', // on-surface-variant
    fontSize: 15,
    lineHeight: 22,
    maxWidth: '90%',
  },
  cameraContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Platform.OS === 'ios' ? 32 : 0,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
    backgroundColor: '#1b1f2c', // surface-container
    elevation: 10,
    shadowColor: '#b1c5ff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  cameraSection: {
    marginTop: 12,
  },
  cameraFrame: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: VIEWFINDER_PADDING,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: VIEWFINDER_PADDING,
    height: SCAN_LINE_HEIGHT,
    backgroundColor: 'rgba(177, 197, 255, 0.8)',
    borderRadius: 2,
    shadowColor: '#b1c5ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  cornerTopLeft: { position: 'absolute', top: 30, left: 30, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#b1c5ff', borderTopLeftRadius: 12 },
  cornerTopRight: { position: 'absolute', top: 30, right: 30, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#b1c5ff', borderTopRightRadius: 12 },
  cornerBottomLeft: { position: 'absolute', bottom: 30, left: 30, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#b1c5ff', borderBottomLeftRadius: 12 },
  cornerBottomRight: { position: 'absolute', bottom: 30, right: 30, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#b1c5ff', borderBottomRightRadius: 12 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlayDim: {
    backgroundColor: 'rgba(15, 19, 31, 0.7)',
  },
  cameraLoadingText: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraRetryText: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  glassCard: {
    backgroundColor: 'rgba(27, 31, 44, 0.8)', // surface-container at 80%
    borderRadius: 24,
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(66, 70, 84, 0.2)', // outline-variant ghost border
  },
  manualLabel: {
    color: '#dfe2f3',
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#313442', // surface-variant
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#dfe2f3',
    fontSize: 16,
  },
  primaryButton: {
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#002c72', // on-primary
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  errorCard: {
    backgroundColor: 'rgba(147, 0, 10, 0.1)',
    borderColor: 'rgba(255, 180, 171, 0.3)',
  },
  warningCard: {
    backgroundColor: 'rgba(229, 111, 23, 0.1)',
    borderColor: 'rgba(255, 182, 140, 0.3)',
  },
  errorText: {
    color: '#ffb4ab',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  warningText: {
    color: '#ffb68c',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  permissionText: {
    color: '#c2c6d7',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionErrorText: {
    color: palette.danger,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  resultCard: {
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  resultTitle: {
    color: '#dfe2f3',
    fontSize: 22,
    fontWeight: '800',
  },
  resultDetails: {
    gap: 12,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  resultLabel: {
    color: '#c2c6d7',
    fontSize: 14,
    fontWeight: '600',
  },
  resultValue: {
    color: '#dfe2f3',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    flex: 1,
  },
  tierSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(66, 70, 84, 0.2)',
    gap: 8,
  },
  tierTitle: {
    color: '#b1c5ff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierName: {
    color: '#c2c6d7',
    fontSize: 13,
  },
  tierCount: {
    color: '#dfe2f3',
    fontSize: 13,
    fontWeight: '600',
  },
  resetButton: {
    marginTop: 10,
    backgroundColor: '#313442',
    paddingVertical: 16,
    borderRadius: 100,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#dfe2f3',
    fontSize: 16,
    fontWeight: '700',
  },
});
