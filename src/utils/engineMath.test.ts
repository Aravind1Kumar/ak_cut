import { Clip } from '../types/timeline';
import { mapTimelineTimeToSourceTime } from './speedEngine';
import { slipClip, slideClip, rollEdit } from './timelineMath';

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

  const passed = test1Pass && test2Pass && test3Pass;
  return { passed, results };
}
