import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { gradeCard, GradingResult } from '../../constants/cardGrading';
import { identifyCard, CardIdentification } from '../../constants/cardIdentification';

const CARD_W = 260;
const CARD_H = 364;
type Step = 'front' | 'flip' | 'back' | 'analyzing';

export default function ScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('front');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isLevel, setIsLevel] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const frontUriRef = useRef<string | null>(null);
  const backUriRef = useRef<string | null>(null);

  // Accelerometer level indicator
  useEffect(() => {
    Accelerometer.setUpdateInterval(150);
    const sub = Accelerometer.addListener(({ x, y }) => {
      setTilt({ x, y });
      setIsLevel(Math.abs(x) < 0.07 && Math.abs(y) < 0.07);
    });
    return () => sub.remove();
  }, []);

  // Fire API calls when analyzing
  useEffect(() => {
    if (step !== 'analyzing') return;
    let cancelled = false;
    (async () => {
      try {
        const fUri = frontUriRef.current!;
        const bUri = backUriRef.current ?? undefined;
        const [gradeRes, identRes] = await Promise.allSettled([
          gradeCard(fUri, bUri),
          identifyCard(fUri),
        ]);
        if (cancelled) return;
        const grade = gradeRes.status === 'fulfilled' ? gradeRes.value : null;
        const ident = identRes.status === 'fulfilled' ? identRes.value : null;
        pushToAnalysis(fUri, bUri, grade, ident);
      } catch {
        if (!cancelled) pushToAnalysis(frontUriRef.current!, backUriRef.current ?? undefined, null, null);
      }
    })();
    return () => { cancelled = true; };
  }, [step]);

  function pushToAnalysis(fUri: string, bUri: string | undefined, grade: GradingResult | null, ident: CardIdentification | null) {
    const c = grade?.centering?.grade ?? 7;
    const co = grade?.corners?.grade ?? 7;
    const e = grade?.edges?.grade ?? 7;
    const s = grade?.surface?.grade ?? 7;
    const weighted = c * 0.30 + co * 0.25 + e * 0.25 + s * 0.20;
    const minSub = Math.min(c, co, e, s);
    const final = Math.round(Math.min(weighted, minSub + 1) * 2) / 2;

    router.push({
      pathname: '/analysis',
      params: {
        imageUri: fUri,
        backUri: bUri ?? '',
        psaGrade: String(final),
        centering: String(c),
        corners: String(co),
        edges: String(e),
        surface: String(s),
        centeringRatioLR: grade?.centering?.leftRightRatio ?? '',
        centeringRatioTB: grade?.centering?.topBottomRatio ?? '',
        centeringDetails: grade?.centering?.details ?? '',
        cornersDetails: grade?.corners?.details ?? '',
        cornersIssues: JSON.stringify(grade?.corners?.issues ?? []),
        edgesDetails: grade?.edges?.details ?? '',
        edgesIssues: JSON.stringify(grade?.edges?.issues ?? []),
        surfaceDetails: grade?.surface?.details ?? '',
        surfaceIssues: JSON.stringify(grade?.surface?.issues ?? []),
        overallNotes: grade?.overallNotes ?? '',
        cardName: ident?.cardName ?? '',
        setName: ident?.setName ?? '',
        cardNumber: ident?.cardNumber ?? '',
        gameType: ident?.gameType ?? '',
        rarity: ident?.rarity ?? '',
        isHolo: ident?.isHolo ? 'true' : 'false',
      },
    });
  }

  async function capture() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (!photo) return;
    if (step === 'front') {
      frontUriRef.current = photo.uri;
      setStep('flip');
    } else if (step === 'back') {
      backUriRef.current = photo.uri;
      setStep('analyzing');
    }
  }

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.white}>Camera permission needed</Text>
        <TouchableOpacity style={s.btn} onPress={requestPermission}>
          <Text style={s.btnTxt}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'analyzing') {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={[s.white, { marginTop: 16, fontSize: 18 }]}>Analyzing card...</Text>
        <Text style={{ color: '#888', marginTop: 6, fontSize: 13 }}>AI grading in progress</Text>
      </View>
    );
  }

  if (step === 'flip') {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', gap: 16 }]}>
        <Text style={{ fontSize: 48 }}>↩</Text>
        <Text style={[s.white, { fontSize: 22, fontWeight: '700' }]}>Flip the card</Text>
        <Text style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>Now scan the back</Text>
        <TouchableOpacity style={s.btn} onPress={() => setStep('back')}>
          <Text style={s.btnTxt}>Ready — Scan Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera frame layout
  const cx = 195, cy = 430;
  const fl = cx - CARD_W / 2, ft = cy - CARD_H / 2;
  const bubbleColor = isLevel ? '#00e676' : '#ff9800';
  const bx = Math.max(-16, Math.min(16, tilt.x * 55));
  const by = Math.max(-16, Math.min(16, tilt.y * 55));

  return (
    <View style={s.container}>
      <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />

      {/* Overlay */}
      <View style={[s.ov, { top: 0, left: 0, right: 0, height: ft }]} />
      <View style={[s.ov, { top: ft + CARD_H, left: 0, right: 0, bottom: 0 }]} />
      <View style={[s.ov, { top: ft, left: 0, width: fl, height: CARD_H }]} />
      <View style={[s.ov, { top: ft, left: fl + CARD_W, right: 0, height: CARD_H }]} />

      {/* Corner brackets */}
      {([
        [ft - 2, fl - 2, false, false],
        [ft - 2, fl + CARD_W - 22, false, true],
        [ft + CARD_H - 22, fl - 2, true, false],
        [ft + CARD_H - 22, fl + CARD_W - 22, true, true],
      ] as [number, number, boolean, boolean][]).map(([top, left, flipV, flipH], i) => (
        <View key={i} style={[s.bracket, { top, left,
          borderTopWidth: flipV ? 0 : 3,
          borderBottomWidth: flipV ? 3 : 0,
          borderLeftWidth: flipH ? 0 : 3,
          borderRightWidth: flipH ? 3 : 0,
        }]} />
      ))}

      {/* Instruction */}
      <View style={{ position: 'absolute', top: ft - 44, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={s.inst}>{step === 'front' ? 'Align card front in frame' : 'Align card back in frame'}</Text>
      </View>

      {/* Level bubble */}
      <View style={s.levelWrap}>
        <View style={s.levelRing}>
          <View style={[s.bubble, { backgroundColor: bubbleColor, transform: [{ translateX: bx }, { translateY: by }] }]} />
        </View>
        <Text style={[s.levelTxt, { color: bubbleColor }]}>{isLevel ? '✓ Level' : 'Level up'}</Text>
      </View>

      {/* Shutter */}
      <View style={s.shutterRow}>
        <TouchableOpacity style={s.shutter} onPress={capture}>
          <View style={s.shutterInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  ov: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.65)' },
  bracket: { position: 'absolute', width: 22, height: 22, borderColor: '#FFD700' },
  inst: { color: '#fff', fontSize: 14, fontWeight: '600', textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  levelWrap: { position: 'absolute', bottom: 110, right: 18, alignItems: 'center', gap: 4 },
  levelRing: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  bubble: { width: 12, height: 12, borderRadius: 6 },
  levelTxt: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  shutterRow: { position: 'absolute', bottom: 36, left: 0, right: 0, alignItems: 'center' },
  shutter: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
  white: { color: '#fff', fontSize: 16, textAlign: 'center' },
  btn: { backgroundColor: '#FFD700', paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  btnTxt: { color: '#000', fontWeight: '700', fontSize: 15 },
});
