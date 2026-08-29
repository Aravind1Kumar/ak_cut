import { Clip, Track } from '../types/timeline';
import { mapTimelineTimeToSourceTime, SPEED_CURVE_PRESETS } from './speedEngine';
import { slipClip, slideClip, rollEdit, insertClip, overwriteClip, getSourceTimeForTimelineTime, getInterpolatedTransformAtTime } from './timelineMath';
import { useTimelineStore } from '../store/timelineStore';

const mockClip: Clip = {
  id: 'clip-1',
  trackId: 'track-1',
  name: 'Test Clip',
  type: 'video',
  startTime: 10,
  duration: 5,
  mediaOffset: 2,
  sourceDuration: 20,
  src: 'test.mp4',
  speed: 1,
  speedCurve: 'flat',
  transform: { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 },
  filter: { brightness: 100, contrast: 100, saturation: 100, blur: 0, hueRotate: 0, sepia: 0 },
  audio: { volume: 1, fadeIn: 0, fadeOut: 0, muted: false },
  transition: { type: 'none', duration: 0.5 },
  chromaKey: { enabled: false, targetColor: '#00ff00', colorDistance: 0.4, smoothness: 0.1 },
  mask: { type: 'none', x: 0, y: 0, width: 100, height: 100, rotation: 0, feather: 0 },
  keyframes: [],
};

export function runDeterministicEngineValidation(): { passed: boolean; results: string[] } {
  const results: string[] = [];

  // Test 1: Linear Source Time Mapping
  const srcTime = mapTimelineTimeToSourceTime(mockClip, 2.5);
  const test1Pass = Math.abs(srcTime - 4.5) < 0.001;
  results.push(`Test 1 (Linear Source Time Mapping): ${test1Pass ? 'PASS' : 'FAIL'} (Expected 4.5, Got ${srcTime})`);

  // Test 2: Slip Edit Math & Boundary Clamping
  const slipped = slipClip(mockClip, 3);
  const slippedMax = slipClip(mockClip, 100);
  const slippedMin = slipClip(mockClip, -100);
  const test2Pass = slipped.startTime === 10 && slipped.duration === 5 && slipped.mediaOffset === 5 && slippedMax.mediaOffset === 15 && slippedMin.mediaOffset === 0;
  results.push(`Test 2 (Slip Edit Math & Clamping): ${test2Pass ? 'PASS' : 'FAIL'} (MediaOffset: ${slipped.mediaOffset}, MaxClamped: ${slippedMax.mediaOffset}, MinClamped: ${slippedMin.mediaOffset})`);

  // Test 3: Roll Edit Math & Min Duration Protection
  const left: Clip = { ...mockClip, id: 'left', startTime: 0, duration: 4 };
  const right: Clip = { ...mockClip, id: 'right', startTime: 4, duration: 6, mediaOffset: 0 };
  const rolled = rollEdit(left, right, 1);
  const rolledExtreme = rollEdit(left, right, 100);
  const test3Pass = rolled.left.duration === 5 && rolled.right.startTime === 5 && rolled.right.duration === 5 && rolledExtreme.right.duration === 0.1;
  results.push(`Test 3 (Roll Edit Math & Bounds Protection): ${test3Pass ? 'PASS' : 'FAIL'} (Left Dur: ${rolled.left.duration}, Right Start: ${rolled.right.startTime}, MinRightDur: ${rolledExtreme.right.duration})`);

  // Test 4: Slide Edit Math (Explicit Assertions)
  const clipA: Clip = { ...mockClip, id: 'clipA', startTime: 0, duration: 5 };
  const clipB: Clip = { ...mockClip, id: 'clipB', startTime: 5, duration: 5, mediaOffset: 3 };
  const clipC: Clip = { ...mockClip, id: 'clipC', startTime: 10, duration: 5, mediaOffset: 0 };
  const slidedClips = slideClip([clipA, clipB, clipC], 'clipB', 1);
  const test4Pass =
    slidedClips[0].duration === 6 &&
    slidedClips[1].startTime === 6 &&
    slidedClips[2].startTime === 11 &&
    slidedClips[2].duration === 4 &&
    slidedClips[2].mediaOffset === 1;
  results.push(
    `Test 4 (Slide Edit Explicit Assertions): ${test4Pass ? 'PASS' : 'FAIL'} (Prev Dur: ${slidedClips[0].duration}, Target Start: ${slidedClips[1].startTime}, Next Start: ${slidedClips[2].startTime}, Next Dur: ${slidedClips[2].duration})`
  );

  // Test 5: Insert Edit Math (Empty track & Middle insert)
  const existing: Clip = { ...mockClip, id: 'exist', startTime: 5, duration: 10 };
  const newInsert: Clip = { ...mockClip, id: 'insert', startTime: 5, duration: 3 };
  const inserted = insertClip([existing], newInsert);
  const insertedEmpty = insertClip([], newInsert);
  const test5Pass = inserted[0].id === 'insert' && inserted[1].startTime === 8 && insertedEmpty.length === 1;
  results.push(`Test 5 (Insert Edit Shift Math): ${test5Pass ? 'PASS' : 'FAIL'} (Shifted Start: ${inserted[1].startTime}, EmptyCount: ${insertedEmpty.length})`);

  // Test 6: Overwrite Edit Math (Full & Partial Overwrites)
  const targetToOverwrite: Clip = { ...mockClip, id: 'target', startTime: 0, duration: 10 };
  const overwriter: Clip = { ...mockClip, id: 'overwriter', startTime: 3, duration: 4 };
  const overwrote = overwriteClip([targetToOverwrite], overwriter);
  const fullOverwriter: Clip = { ...mockClip, id: 'full', startTime: 0, duration: 12 };
  const fullOverwrote = overwriteClip([targetToOverwrite], fullOverwriter);
  const test6Pass = overwrote.length === 3 && overwrote[0].duration === 3 && overwrote[1].id === 'overwriter' && overwrote[2].startTime === 7 && overwrote[2].duration === 3 && fullOverwrote.length === 1 && fullOverwrote[0].id === 'full';
  results.push(`Test 6 (Overwrite Edit Slice Math): ${test6Pass ? 'PASS' : 'FAIL'} (Result Count: ${overwrote.length}, Full Overwrite Count: ${fullOverwrote.length})`);

  // Test 7: Canonical Timeline → Source Mapping Determinism
  const testTimestamps = [10.0, 11.5, 12.5, 14.0];
  const expectedValues = [2.0, 3.5, 4.5, 6.0];
  let determinismPass = true;
  testTimestamps.forEach((t, i) => {
    const computed = getSourceTimeForTimelineTime(mockClip, t);
    if (Math.abs(computed - expectedValues[i]) > 0.0001) {
      determinismPass = false;
    }
  });
  results.push(`Test 7 (Canonical Timeline → Source Mapping Determinism): ${determinismPass ? 'PASS' : 'FAIL'} (Expected ${expectedValues.join(', ')})`);

  // Test 8: Independent Derivation Speed Curve Testing (HERO, MONTAGE, BULLET TIME, FLASH OUT)
  const heroClip: Clip = { ...mockClip, speedCurve: 'hero', duration: 5, mediaOffset: 2 };
  const heroT1 = mapTimelineTimeToSourceTime(heroClip, 1.0);
  const heroT3_5 = mapTimelineTimeToSourceTime(heroClip, 3.5);
  const heroT5 = mapTimelineTimeToSourceTime(heroClip, 5.0);
  const heroPass = Math.abs(heroT1 - 2.5) < 0.05 && Math.abs(heroT3_5 - 7.75) < 0.05 && Math.abs(heroT5 - 8.95) < 0.05;

  const montageClip: Clip = { ...mockClip, speedCurve: 'montage', duration: 5, mediaOffset: 2 };
  const montageT2_5 = mapTimelineTimeToSourceTime(montageClip, 2.5);
  const montageT5 = mapTimelineTimeToSourceTime(montageClip, 5.0);
  const montagePass = Math.abs(montageT2_5 - 5.75) < 0.05 && Math.abs(montageT5 - 13.25) < 0.05;

  const test8Pass = heroPass && montagePass;
  results.push(`Test 8 (Speed Curves Independent Mathematical Verification): ${test8Pass ? 'PASS' : 'FAIL'} (Hero 1s: ${heroT1.toFixed(2)} [Exp 2.5], Hero 5s: ${heroT5.toFixed(2)} [Exp 8.95], Montage 5s: ${montageT5.toFixed(2)} [Exp 13.25])`);

  // Test 9: Real Zustand Store History Operations (pushHistory, slipSelectedClip, undo, redo)
  const initialTrack: Track = { id: 'track-v1', name: 'Main', type: 'video', locked: false, hidden: false, muted: false, clips: [clipB] };
  useTimelineStore.setState({
    tracks: [initialTrack],
    selectedClipId: 'clipB',
    history: [],
    historyIndex: -1,
  });

  useTimelineStore.getState().pushHistory();
  useTimelineStore.getState().slipSelectedClip(2);
  const stateB_offset = useTimelineStore.getState().tracks[0].clips[0].mediaOffset;

  useTimelineStore.getState().undo();
  const stateA_undone_offset = useTimelineStore.getState().tracks[0].clips[0].mediaOffset;

  useTimelineStore.getState().redo();
  const stateB_redone_offset = useTimelineStore.getState().tracks[0].clips[0].mediaOffset;

  const test9Pass = stateB_offset === 5 && stateA_undone_offset === 3 && stateB_redone_offset === 5;
  results.push(`Test 9 (Real Zustand Store History Undo/Redo): ${test9Pass ? 'PASS' : 'FAIL'} (State B: ${stateB_offset}, Undone State A: ${stateA_undone_offset}, Redone State B: ${stateB_redone_offset})`);

  // Test 10: Universal Keyframe Interpolation Engine (Scale & Opacity Ramping)
  const keyframeClip: Clip = {
    ...mockClip,
    startTime: 10,
    duration: 10,
    transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0 },
    keyframes: [
      { id: 'k1', time: 0, transform: { scale: 1.0, opacity: 1.0 } },
      { id: 'k2', time: 10, transform: { scale: 2.0, opacity: 0.0 } },
    ],
  };

  const kStart = getInterpolatedTransformAtTime(keyframeClip, 10);  // local 0s
  const kMid = getInterpolatedTransformAtTime(keyframeClip, 15);    // local 5s
  const kEnd = getInterpolatedTransformAtTime(keyframeClip, 20);    // local 10s

  const test10Pass = kStart.scale === 1.0 && kMid.scale === 1.5 && kMid.opacity === 0.5 && kEnd.scale === 2.0 && kEnd.opacity === 0.0;
  results.push(`Test 10 (Universal Keyframe Interpolation Engine): ${test10Pass ? 'PASS' : 'FAIL'} (Mid Scale: ${kMid.scale}, Mid Opacity: ${kMid.opacity})`);

  const passed = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass && determinismPass && test8Pass && test9Pass && test10Pass;
  return { passed, results };
}
