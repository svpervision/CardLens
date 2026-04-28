import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/theme';
import { PLACEHOLDER_ANALYSIS } from '../../constants/cardData';
import { gradeCenteringFromPixels } from '../../constants/centeringAnalysis';
import { CardIdentificationResult, identifyCard } from '../../constants/cardIdentification';
import { CardGradingResult, gradeCard } from '../../constants/cardGrading';
import { saveCard } from '../../store/collection';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CARD_W = SCREEN_W * 0.82;
const CARD_H = CARD_W * 1.396;
const CORNER_SIZE = 20;
const CORNER_THICK = 3;
const frameTop = (SCREEN_H - CARD_H) / 2;
const frameLeft = (SCREEN_W - CARD_W) / 2;

type ScanStep = 'front' | 'back' | 'analyzing';

type CenteringResult = {
  lr: [number, number];
  tb: [number, number];
  grade: number;
};

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<ScanStep>('front');
  const [frontUri, setFrontUri] = useState<string | null>(null);
  const [backUri, setBackUri] = useState<string | null>(null);
  const [frontCentering, setFrontCentering] = useState<CenteringResult | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [accel, setAccel] = useState({ x: 0, y: 0, z: 1 });

  const scanLineY = useSharedValue(0);
  const scanLineOpacity = useSharedValue(0);

  // Capture refs so the async IIFE always sees up-to-date values
  const frontUriRef = useRef<string | null>(null);
  const backUriRef = useRef<string | null>(null);
  const frontCenteringRef = useRef<CenteringResult | null>(null);
  frontUriRef.current = frontUri;
  backUriRef.current = backUri;
  frontCenteringRef.current = frontCentering;

  useEffect(() => {
    if (step !== 'analyzing') {
      scanLineOpacity.value = withTiming(0, { duration: 200 });
      return;
    }

    scanLineOpacity.value = withTiming(1, { duration: 200 });
    scanLineY.value = 0;
    scanLineY.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    let cancelled = false;

    (async () => {
      const uri = frontUriRef.current;
      const bUri = backUriRef.current;

      const identPromise: Promise<CardIdentificationResult | null> =
        uri !== null
          ? identifyCard(uri).catch(() => null)
          : Promise.resolve(null);

      const gradePromise: Promise<CardGradingResult | null> =
        uri !== null
          ? gradeCard(uri, bUri).catch(() => null)
          : Promise.resolve(null);

      const minWait = new Promise<void>((resolve) => setTimeout(resolve, 1500));
      const [identResult, gradeResult] = await Promise.all([identPromise, gradePromise]);
      await minWait;

      if (!cancelled) {
        await finishAnalysis(identResult, gradeResult);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step]);

  useEffect(() => {
    if (step === 'analyzing') return;
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(setAccel);
    return () => sub.remove();
  }, [step]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value * CARD_H }],
    opacity: scanLineOpacity.value,
  }));

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permContainer}>
        <Text style={styles.permTitle}>Camera Access Needed</Text>
        <Text style={styles.permBody}>
          CardLens needs camera access to scan your trading cards.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (step === 'front') {
        if (photo) {
          const scaleX = photo.width / SCREEN_W;
          const scaleY = photo.height / SCREEN_H;
          const result = gradeCenteringFromPixels(photo.width, photo.height, {
            left: frameLeft * scaleX,
            right: (frameLeft + CARD_W) * scaleX,
            top: frameTop * scaleY,
            bottom: (frameTop + CARD_H) * scaleY,
          });
          setFrontCentering({
            lr: result.frontRatio,
            tb: result.topBottomRatio,
            grade: result.grade,
          });
        }
        setFrontUri(photo?.uri ?? null);
        setStep('back');
      } else if (step === 'back') {
        setBackUri(photo?.uri ?? null);
        setStep('analyzing');
      }
    } catch {
      // ignore capture errors
    }
  }

  async function finishAnalysis(
    identResult: CardIdentificationResult | null,
    gradingResult: CardGradingResult | null,
  ) {
    const centering = frontCenteringRef.current;
    const uri = frontUriRef.current;

    const centeringGrade = centering?.grade ?? PLACEHOLDER_ANALYSIS.subGrades.centering;
    const corners = gradingResult?.corners ?? PLACEHOLDER_ANALYSIS.subGrades.corners;
    const edges = gradingResult?.edges ?? PLACEHOLDER_ANALYSIS.subGrades.edges;
    const surface = gradingResult?.surface ?? PLACEHOLDER_ANALYSIS.subGrades.surface;
    const cornerColors = gradingResult?.cornerColors ?? PLACEHOLDER_ANALYSIS.cornerColors;

    const subGrades = { centering: centeringGrade, corners, edges, surface };
    const psaGrade = gradingResult
      ? Math.min(10, Math.max(1, Math.round((centeringGrade + corners + edges + surface) / 4)))
      : PLACEHOLDER_ANALYSIS.psaGrade;

    const analysis = {
      ...PLACEHOLDER_ANALYSIS,
      id: `card-${Date.now()}`,
      frontUri: uri,
      timestamp: Date.now(),
      subGrades,
      cornerColors,
      psaGrade,
    };
    await saveCard(analysis);
    router.push({
      pathname: '/analysis',
      params: {
        imageUri: uri ?? '',
        centeringData: centering ? JSON.stringify(centering) : '',
        cardIdentification: identResult ? JSON.stringify(identResult) : '',
      },
    });
    setStep('front');
    setFrontUri(null);
    setBackUri(null);
    setFrontCentering(null);
  }

  const stepLabel =
    step === 'front'
      ? 'Align front of card'
      : step === 'back'
      ? 'Flip card — align back'
      : 'Analyzing…';

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.vignette} pointerEvents="none" />

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <View style={{ width: 44 }} />
        <View style={styles.topBarCenter}>
          <Text style={styles.appName}>CardLens</Text>
          <Text style={styles.stepLabel}>{stepLabel}</Text>
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {/* card overlay frame */}
      <View style={styles.frameContainer} pointerEvents="none">
        <View style={[styles.dimOverlay, styles.dimTop]} />
        <View style={[styles.dimOverlay, styles.dimBottom]} />
        <View
          style={[
            styles.dimOverlay,
            styles.dimSide,
            { left: 0, top: frameTop, height: CARD_H },
          ]}
        />
        <View
          style={[
            styles.dimOverlay,
            styles.dimSide,
            { right: 0, top: frameTop, height: CARD_H },
          ]}
        />

        <View style={styles.cardFrame}>
          {step === 'analyzing' && (
            <Animated.View style={[styles.scanLine, scanLineStyle]} />
          )}
          <CornerMark position="topLeft" />
          <CornerMark position="topRight" />
          <CornerMark position="bottomLeft" />
          <CornerMark position="bottomRight" />
        </View>
      </View>

      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        {step === 'back' && (
          <View style={styles.flipHint}>
            <Text style={styles.flipHintText}>↕ Flip your card</Text>
          </View>
        )}

        <View style={styles.shutterRow}>
          {step !== 'analyzing' && (
            <View style={styles.levelWrap}>
              <LevelIndicator x={accel.x} y={accel.y} />
            </View>
          )}
          {step !== 'analyzing' ? (
            <Pressable
              style={({ pressed }) => [styles.shutterBtn, pressed && styles.shutterPressed]}
              onPress={capture}
            >
              <View style={styles.shutterRing}>
                <View style={styles.shutterInner} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.analyzingIndicator}>
              <Text style={styles.analyzingText}>Analyzing card…</Text>
            </View>
          )}
        </View>

        <View style={styles.stepDots}>
          <StepDot active={step === 'front'} done={step === 'back' || step === 'analyzing'} />
          <StepDot active={step === 'back'} done={step === 'analyzing'} />
          <StepDot active={step === 'analyzing'} done={false} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function CornerMark({
  position,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
}) {
  const isTop = position.startsWith('top');
  const isLeft = position.endsWith('Left');
  return (
    <View
      style={[
        styles.corner,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
      ]}
    >
      <View
        style={[
          styles.cornerH,
          isLeft ? { left: 0 } : { right: 0 },
          isTop ? { top: 0 } : { bottom: 0 },
        ]}
      />
      <View
        style={[
          styles.cornerV,
          isLeft ? { left: 0 } : { right: 0 },
          isTop ? { top: 0 } : { bottom: 0 },
        ]}
      />
    </View>
  );
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        done && styles.dotDone,
        active && styles.dotActive,
      ]}
    />
  );
}

const LEVEL_OUTER = 32;
const LEVEL_BUBBLE = 16;
const LEVEL_MAX_OFFSET = (LEVEL_OUTER - LEVEL_BUBBLE) / 2;
const LEVEL_TILT_RANGE = 0.3;

function LevelIndicator({ x, y }: { x: number; y: number }) {
  const clamp = (v: number) => Math.max(-1, Math.min(1, v / LEVEL_TILT_RANGE));
  const dx = clamp(x) * LEVEL_MAX_OFFSET;
  const dy = clamp(-y) * LEVEL_MAX_OFFSET;

  const isGood = Math.abs(x) < 0.08 && Math.abs(y) < 0.08;
  const isFair = Math.abs(x) < 0.2 && Math.abs(y) < 0.2;
  const bubbleColor = isGood ? '#4CAF50' : isFair ? '#FFD700' : '#FF5252';
  const labelColor = isGood ? '#4CAF50' : isFair ? '#FFD700' : '#FF5252';
  const labelText = isGood ? 'Level ✓' : 'Tilt';

  return (
    <View style={styles.levelIndicator}>
      <View style={styles.levelOuter}>
        <View
          style={[
            styles.levelBubble,
            { backgroundColor: bubbleColor, transform: [{ translateX: dx }, { translateY: dy }] },
          ]}
        />
      </View>
      <Text style={[styles.levelLabel, { color: labelColor }]}>{labelText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  permContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permTitle: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 22,
    marginBottom: 12,
  },
  permBody: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permBtnText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 10,
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
  },
  appName: {
    color: Colors.gold,
    fontFamily: Fonts.bold,
    fontSize: 18,
    letterSpacing: 1.5,
  },
  stepLabel: {
    color: Colors.text,
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 4,
    opacity: 0.85,
  },
  frameContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dimOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  dimTop: {
    top: 0,
    left: 0,
    right: 0,
    height: frameTop,
  },
  dimBottom: {
    top: frameTop + CARD_H,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dimSide: {
    width: frameLeft,
  },
  cardFrame: {
    position: 'absolute',
    top: frameTop,
    left: frameLeft,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.gold,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerH: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_THICK,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  cornerV: {
    position: 'absolute',
    width: CORNER_THICK,
    height: CORNER_SIZE,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 16,
    zIndex: 10,
  },
  flipHint: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  flipHintText: {
    color: Colors.gold,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },
  shutterRow: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
  },
  shutterBtn: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { opacity: 0.7 },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.gold,
  },
  analyzingIndicator: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  analyzingText: {
    color: Colors.gold,
    fontFamily: Fonts.semiBold,
    fontSize: 15,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  levelWrap: {
    position: 'absolute',
    left: 24,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    height: 88,
  },
  levelIndicator: {
    alignItems: 'center',
    gap: 4,
  },
  levelOuter: {
    width: LEVEL_OUTER,
    height: LEVEL_OUTER,
    borderRadius: LEVEL_OUTER / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelBubble: {
    width: LEVEL_BUBBLE,
    height: LEVEL_BUBBLE,
    borderRadius: LEVEL_BUBBLE / 2,
  },
  levelLabel: {
    fontSize: 10,
    fontFamily: Fonts.semiBold,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 24,
  },
  dotDone: {
    backgroundColor: Colors.green,
  },
});
