import test from 'node:test';
import assert from 'node:assert/strict';
import { isPrivateOrReservedIp, validateExternalAudioUrl } from './ssrf-guard';

test('SSRF guard: blocks localhost, metadata IPs, and non-HTTP protocols', () => {
  assert.equal(validateExternalAudioUrl('http://localhost:3000/test.mp3').valid, false);
  assert.equal(validateExternalAudioUrl('http://127.0.0.1/audio.wav').valid, false);
  assert.equal(validateExternalAudioUrl('http://169.254.169.254/latest/meta-data/').valid, false);
  assert.equal(validateExternalAudioUrl('http://192.168.1.10/song.flac').valid, false);
  assert.equal(validateExternalAudioUrl('file:///etc/passwd').valid, false);
  assert.equal(validateExternalAudioUrl('https://service.internal/a.mp3').valid, false);
});

test('SSRF guard: allows valid public HTTPS URLs', () => {
  const res = validateExternalAudioUrl('https://cdn.example.org/audio/sample.wav');
  assert.equal(res.valid, true);
  assert.equal(res.url?.hostname, 'cdn.example.org');
});

test('isPrivateOrReservedIp: accurately classifies IPv4 and IPv6 ranges', () => {
  assert.equal(isPrivateOrReservedIp('10.0.0.5'), true);
  assert.equal(isPrivateOrReservedIp('172.16.0.1'), true);
  assert.equal(isPrivateOrReservedIp('::1'), true);
  assert.equal(isPrivateOrReservedIp('fe80::1'), true);
  assert.equal(isPrivateOrReservedIp('8.8.8.8'), false);
});
