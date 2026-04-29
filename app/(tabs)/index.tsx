import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { gradeCard, GradingResult } from '../../constants/cardGrading';
import { identifyCard } from '../../constants/cardIdentification';

const CARD_W = 280;
const CARD_H = 392;

type Step = 'front' | 'flip' | 'back' | 'analyzing';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isLevel, setIsLevel] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const frontUriRef = useRef<string | null>(null);
  const backUriRef = useRef<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Accelerometer.setUpdateInterval(150);
    const sub = Accelerometer.addListener(({ x, y }) => {
      setTilt({ x, y });
      setIsLevel(Math.abs(x) < 0.07 && Math.abs(y) < 0.07);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (step !== 'analyzing') return;
    let cancelled = false;

    (async () => {
      try {
        const fUri = frontUriRef.current!;
        const bUri = backUriRef.current ?? undefined;
        const [gradeRes, identifyRes] = await Promise.allSettled([
          gradeCard(fUri, bUri),
          identifyCard(fUri),
        ]);
        if (cancelled) return;
        const gradeResult = gradeRes.status === 'fulfilled' ? gradeRes.value : null;
        const identifyResult = identifyRes.status === 'fulfilled' ? identifyRes.value : null;
        finishAnalysis(gradeResult, identifyResult, fUri, bUri);
      } catch {
        if (!cancelled) finishAnalysis(null, null, frontUriRef.current!, backUriRef.current ?? undefined);
      }
    })();

    return () => { cancelled = true; };
  }, [step]);

  function finishAnalysis(gradeResult: GradingResult | null, identifyResult: any, fUri: string, bUri?: string) {
    const centering = gradeResult?.centering?.grade ?? 7;
    const corners = gradeResult?.corners?.grade ?? 7;
    const edges = gradeResult?.edges?.grade ?? 7;
    const surface = gradeResult?.surface?.grade ?? 7;
    const weighted = centering * 0.30 + corners * 0.25 + edges * 0.25 + surface * 0.20;
    const minSub = Math.min(centering, corners, edges, surface);
    const psaGrade = Math.min(weighted, minSub + 1);
    const finalGrade = Math.round(psaGrade * 2) / 2;

    router.push({
      pathname: '/analysis',
      params: {
        imageUri: fUri,
        backUri: bUri ?? '',
        psaGrade: String(finalGrade),
        centering: String(centering),
        corners: String(corners),
        edges: String(edges),
        surface: String(surface),
        centeringDetails: gradeResult?.centering?.details ?? '',
        centeringRatioLR: gradeResult?.centering?.leftRightRatio ?? '',
        centeringRatioTB: gradeResult?.centering?.topBottomRatio ?? '',
        cornersDetails: gradeResult?.corners?.details ?? '',
        cornersIssues: JSON.stringify(gradeResult?.corners?.issues ?? []),
        edgesDetails: gradeResult?.edges?.details ?? '',
        edgesIssues: JSON.stringify(gradeResult?.edges?.issues ?? []),
        surfaceDetails: gradeResult?.surface?.details ?? '',
        surfaceIssues: JSON.stringify(gradeResult?.surface?.issues ?? []),
        overallNotes: gradeResult?.overallNotes ?? '',
        cardName: identifyResult?.cardName ?? 'Unknown Card',
        setName: identifyResult?.setName ?? '',
        cardNumber: identifyResult?.cardNumber ?? '',
        gameType: identifyResult?.gameType ?? '',
      },
    });
  }

  async function capture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (!photo) return;
    if (step === 'front') {
      setFrontUri(photo.uri);
      frontUriRef.current = photo.uri;
      setStep('flip');
    } else if (step === 'back') {
      setBackUri(photo.uri);
      backUriRef.current = photo.uri;
      setStep('analyzing');
    }
  }

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permText}>Camera access needed</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'analyzing') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={[styles.permText, { marginTop: 16 }]}>Analyzing card...</Text>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>This may take a moment</Text>
      </View>
    );
  }

  if (step === 'flip') {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#FFD700', fontSize: 28, fontWeight: '800', marginBottom: 12 }}>↩</Text>
        <Text style={styles.permText}>Flip the card over</Text>
        <Text style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>Now scan the back</Text>
        <TouchableOpacity style={styles.btn} onPress={() => setStep('back')}>
          <Text style={styles.btnText}>Ready — Scan Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenCenterX = 195;
  const screenCenterY = 420;
  const frameLeft = screenCenterX - CARD_W / 2;
  const frameTop = screenCenterY - CARD_H / 2;

  const bubbleColor = isLevel ? '#00e676' : '#ff9800';

  return (
    <View style={styles.container}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />

      {/* Dark overlays */}
      <View style={[styles.overlay, { top: 0, left: 0, right: 0, height: frameTop }]} />
      <View style={[styles.overlay, { top: frameTop + CARD_H, left: 0, right: 0, bottom: 0 }]} />
      <View style={[styles.overlay, { top: frameTop, left: 0, width: frameLeft, height: CARD_H }]} />
      <View style={[styles.overlay, { top: frameTop, left: frameLeft + CARD_W, right: 0, height: CARD_H }]} />

      {/* Gold corner brackets */}
      {[
        { top: frameTop - 2, left: frameLeft - 2 },
        { top: frameTop - 2, left: frameLeft + CARD_W - 22 },
        { top: frameTop + CARD_H - 22, left: frameLeft - 2 },
        { top: frameTop + CARD_H - 22, left: frameLeft + CARD_W - 22 },
      ].map((pos, i) => (
        <View key={i} style={[styles.corner, pos,
          i === 0 && { borderRightWidth: 0, borderBottomWidth: 0 },
          i === 1 && { borderLeftWidth: 0, borderBottomWidth: 0 },
          i === 2 && { borderRightWidth: 0, borderTopWidth: 0 },
          i === 3 && { borderLeftWidth: 0, borderTopWidth: 0 },
        ]} />
      ))}

      {/* Level indicator */}
      <View style={styles.levelContainer}>
        <View style={styles.levelRing}>
          <View style={[styles.levelBubble, {
            backgroundColor: bubbleColor,
            transform: [
              { translateX: Math.max(-18, Math.min(18, tilt.x * 60)) },
              { translateY: Math.max(-18, Math.min(18, tilt.y * 60)) },
            ],
          }]} />
        </View>
        <Text style={[styles.levelText, { color: bubbleColor }]}>
          {isLevel ? '✓ Level' : 'Tilt to level'}
        </Text>
      </View>

      {/* Instructions */}
      <View style={{ position: 'absolute', top: frameTop - 48, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={styles.instructionText}>
          {step === 'front' ? 'Align card front within frame' : 'Align card back within frame'}
        </Text>
      </View>

      {/* Shutter button */}
      <View style={styles.shutterRow}>
        <TouchableOpacity style={styles.shutter} onPress={capture}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)' },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#FFD700',
    borderWidth: 3,
  },
  levelContainer: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    alignItems: 'center',
  },
  levelRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBubble: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  shutterRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  permText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  btn: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
});
