import { runDeterministicEngineValidation } from './engineMath.test.ts';

console.log('=== AK CUT DETERMINISTIC ENGINE VALIDATION ===\n');
const { passed, results } = runDeterministicEngineValidation();
results.forEach((res) => console.log(res));

if (passed) {
  console.log('\nALL DETERMINISTIC ENGINE TESTS PASSED.');
  process.exit(0);
} else {
  console.log('\nENGINE TEST FAILURE DETECTED.');
  process.exit(1);
}
