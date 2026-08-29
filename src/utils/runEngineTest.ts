import { runDeterministicEngineValidation } from './engineMath.test';

console.log('=== AK CUT DETERMINISTIC ENGINE VALIDATION ===');
const { passed, results } = runDeterministicEngineValidation();
results.forEach((res) => console.log(res));

if (passed) {
  console.log('\nALL DETERMINISTIC ENGINE TESTS PASSED.');
} else {
  console.log('\nENGINE TEST FAILURE DETECTED.');
}
