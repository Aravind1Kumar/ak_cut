import { Clip } from '../types/timeline';
import { mapTimelineTimeToSourceTime } from './speedEngine';
import { slipClip, slideClip, rollEdit, insertClip, overwriteClip } from './timelineMath';

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

  // Test 2: Slip Edit Math
  const slipped = slipClip(mockClip, 3);
  const test2Pass = slipped.startTime === 10 && slipped.duration === 5 && slipped.mediaOffset === 5;
  results.push(`Test 2 (Slip Edit Math): ${test2Pass ? 'PASS' : 'FAIL'} (MediaOffset: ${slipped.mediaOffset})`);

  // Test 3: Roll Edit Math
  const left: Clip = { ...mockClip, id: 'left', startTime: 0, duration: 4 };
  const right: Clip = { ...mockClip, id: 'right', startTime: 4, duration: 6, mediaOffset: 0 };
  const rolled = rollEdit(left, right, 1);
  const test3Pass = rolled.left.duration === 5 && rolled.right.startTime === 5 && rolled.right.duration === 5;
  results.push(`Test 3 (Roll Edit Math): ${test3Pass ? 'PASS' : 'FAIL'} (Left Dur: ${rolled.left.duration}, Right Start: ${rolled.right.startTime})`);

  // Test 4: Slide Edit Math (Explicit Assertions)
  const clipA: Clip = { ...mockClip, id: 'clipA', startTime: 0, duration: 5 };
  const clipB: Clip = { ...mockClip, id: 'clipB', startTime: 5, duration: 5 };
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

  // Test 5: Insert Edit Math
  const existing: Clip = { ...mockClip, id: 'exist', startTime: 5, duration: 10 };
  const newInsert: Clip = { ...mockClip, id: 'insert', startTime: 5, duration: 3 };
  const inserted = insertClip([existing], newInsert);
  const test5Pass = inserted[0].id === 'insert' && inserted[1].startTime === 8;
  results.push(`Test 5 (Insert Edit Shift Math): ${test5Pass ? 'PASS' : 'FAIL'} (Shifted Start: ${inserted[1].startTime})`);

  // Test 6: Overwrite Edit Math
  const targetToOverwrite: Clip = { ...mockClip, id: 'target', startTime: 0, duration: 10 };
  const overwriter: Clip = { ...mockClip, id: 'overwriter', startTime: 3, duration: 4 };
  const overwrote = overwriteClip([targetToOverwrite], overwriter);
  const test6Pass = overwrote.length === 3 && overwrote[0].duration === 3 && overwrote[1].id === 'overwriter' && overwrote[2].startTime === 7 && overwrote[2].duration === 3;
  results.push(`Test 6 (Overwrite Edit Slice Math): ${test6Pass ? 'PASS' : 'FAIL'} (Result Count: ${overwrote.length}, Left Dur: ${overwrote[0].duration}, Right Start: ${overwrote[2].startTime})`);

  const passed = test1Pass && test2Pass && test3Pass && test4Pass && test5Pass && test6Pass;
  return { passed, results };
}
