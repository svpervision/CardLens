import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
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
import { getApiKey, saveApiKey } from '../../constants/config';
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
  const [frontCentering, setFrontCentering] = useState<CenteringResult | null>(null);
  const [showApiModal, setShowApiModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const cameraRef = useRef<CameraView>(null);

  const scanLineY = useSharedValue(0);
  const scanLineOpacity = useSharedValue(0);

  // Capture refs so the async IIFE always sees up-to-date values
  const frontUriRef = useRef<string | null>(null);
  const frontCenteringRef = useRef<CenteringResult | null>(null);
  frontUriRef.current = frontUri;
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
      const apiKey = await getApiKey();
      const uri = frontUriRef.current;

      const identPromise: Promise<CardIdentificationResult | null> =
        apiKey !== null && uri !== null
          ? identifyCard(uri, apiKey).catch(() => null)
          : Promise.resolve(null);

      const [identResult] = await Promise.all([
        identPromise,
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]);

      if (!cancelled) {
        await finishAnalysis(identResult);
      }
    })();

    return () => {
      cancelled = true;
    };
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
        setStep('analyzing');
      }
    } catch {
      // ignore capture errors
    }
  }

  async function finishAnalysis(identResult: CardIdentificationResult | null) {
    const centering = frontCenteringRef.current;
    const uri = frontUriRef.current;

    const analysis = {
      ...PLACEHOLDER_ANALYSIS,
      id: `card-${Date.now()}`,
      frontUri: uri,
      timestamp: Date.now(),
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
    setFrontCentering(null);
  }

  async function openApiModal() {
    const key = await getApiKey();
    setApiKeyInput(key ?? '');
    setShowApiModal(true);
  }

  async function saveApiKeyAndClose() {
    await saveApiKey(apiKeyInput.trim());
    setShowApiModal(false);
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
        <Pressable style={styles.gearBtn} onPress={openApiModal}>
          <Text style={styles.gearIcon}>⚙</Text>
        </Pressable>
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

      {/* API key settings modal */}
      <Modal
        visible={showApiModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApiModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowApiModal(false)}>
          <Pressable style={styles.apiModal} onPress={() => {}}>
            <Text style={styles.apiModalTitle}>Anthropic API Key</Text>
            <Text style={styles.apiModalLabel}>
              Enter your Anthropic API key to enable AI card identification
            </Text>
            <TextInput
              style={styles.apiKeyInput}
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              secureTextEntry
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.saveBtn} onPress={saveApiKeyAndClose}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  gearBtn: {
    width: 44,
    alignItems: 'flex-end',
  },
  gearIcon: {
    color: Colors.gold,
    fontSize: 22,
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
  // API key modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  apiModal: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  apiModalTitle: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  apiModalLabel: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  apiKeyInput: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontFamily: Fonts.regular,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
});
