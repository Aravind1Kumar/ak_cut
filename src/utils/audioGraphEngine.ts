import { Clip, Track } from '../types/timeline';
import { getEffectiveAudioVolumeAtTime } from './timelineMath';

export interface AudioProcessingNodes {
  gainNode: GainNode;
  hpFilterNode: BiquadFilterNode;
  lpFilterNode: BiquadFilterNode;
  pannerNode: StereoPannerNode | PannerNode;
}

let audioCtx: AudioContext | null = null;
const activeNodesMap = new Map<string, AudioProcessingNodes>();
const mediaElementSourceMap = new Map<string, MediaElementAudioSourceNode>();

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Connects an HTMLMediaElement (video or audio) into the Web Audio processing graph
 * with Gain, High-Pass Filter, Low-Pass Filter, and Stereo Panner.
 */
export function setupMediaElementAudioGraph(
  element: HTMLMediaElement,
  clip: Clip,
  allTracks: Track[],
  currentTime: number
): AudioProcessingNodes | null {
  try {
    const ctx = getAudioContext();
    element.muted = false; // Unmute HTML element as AudioContext destination handles output

    let sourceNode = mediaElementSourceMap.get(clip.id);
    if (!sourceNode) {
      sourceNode = ctx.createMediaElementSource(element);
      mediaElementSourceMap.set(clip.id, sourceNode);
    }

    let nodes = activeNodesMap.get(clip.id);
    if (!nodes) {
      const gainNode = ctx.createGain();
      const hpFilterNode = ctx.createBiquadFilter();
      hpFilterNode.type = 'highpass';

      const lpFilterNode = ctx.createBiquadFilter();
      lpFilterNode.type = 'lowpass';

      let pannerNode: StereoPannerNode | PannerNode;
      if (typeof ctx.createStereoPanner === 'function') {
        pannerNode = ctx.createStereoPanner();
      } else {
        pannerNode = ctx.createPanner();
        (pannerNode as PannerNode).panningModel = 'equalpower';
      }

      // Connect Chain: Source -> Gain -> HP Filter -> LP Filter -> Panner -> Destination
      sourceNode.disconnect();
      sourceNode.connect(gainNode);
      gainNode.connect(hpFilterNode);
      hpFilterNode.connect(lpFilterNode);
      lpFilterNode.connect(pannerNode as AudioNode);
      (pannerNode as AudioNode).connect(ctx.destination);

      nodes = { gainNode, hpFilterNode, lpFilterNode, pannerNode };
      activeNodesMap.set(clip.id, nodes);
    }

    // Update real-time node properties
    updateAudioGraphProperties(nodes, clip, allTracks, currentTime);

    return nodes;
  } catch (e) {
    console.warn(`[AudioGraphEngine] Failed to setup graph for clip ${clip.id}:`, e);
    return null;
  }
}

/**
 * Real-time updates for Volume, High-Pass Cutoff, Low-Pass Cutoff, and Stereo Pan
 */
export function updateAudioGraphProperties(
  nodes: AudioProcessingNodes,
  clip: Clip,
  allTracks: Track[],
  currentTime: number
) {
  const effectiveVol = getEffectiveAudioVolumeAtTime(clip, allTracks, currentTime);
  nodes.gainNode.gain.setValueAtTime(effectiveVol, 0);

  const hpFreq = clip.audio?.highPass && clip.audio.highPass > 20 ? clip.audio.highPass : 20;
  nodes.hpFilterNode.frequency.setValueAtTime(hpFreq, 0);

  const lpFreq = clip.audio?.lowPass && clip.audio.lowPass < 20000 ? clip.audio.lowPass : 20000;
  nodes.lpFilterNode.frequency.setValueAtTime(lpFreq, 0);

  const panVal = Math.max(-1, Math.min(1, (clip.audio?.pan || 0) / 100));
  if ('pan' in nodes.pannerNode) {
    (nodes.pannerNode as StereoPannerNode).pan.setValueAtTime(panVal, 0);
  } else {
    (nodes.pannerNode as PannerNode).setPosition(panVal, 0, 1 - Math.abs(panVal));
  }
}

/**
 * Builds the exact Web Audio processing chain in OfflineAudioContext for video export
 */
export function applyOfflineAudioGraph(
  offlineCtx: OfflineAudioContext,
  sourceNode: AudioNode,
  clip: Clip,
  allTracks: Track[]
) {
  const volumeGain = clip.audio?.volume ?? 1.0;
  const gainNode = offlineCtx.createGain();

  if (clip.audio?.muted) {
    gainNode.gain.setValueAtTime(0, clip.startTime);
  } else {
    gainNode.gain.setValueAtTime(volumeGain, clip.startTime);

    if (clip.audio?.fadeIn && clip.audio.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, clip.startTime);
      gainNode.gain.linearRampToValueAtTime(volumeGain, clip.startTime + clip.audio.fadeIn);
    }

    if (clip.audio?.fadeOut && clip.audio.fadeOut > 0) {
      const fadeOutStart = clip.startTime + clip.duration - clip.audio.fadeOut;
      gainNode.gain.setValueAtTime(volumeGain, Math.max(clip.startTime, fadeOutStart));
      gainNode.gain.linearRampToValueAtTime(0, clip.startTime + clip.duration);
    }
  }

  // 1. Connect Source -> Gain
  sourceNode.connect(gainNode);
  let lastNode: AudioNode = gainNode;

  // 2. High-Pass Filter (Remove low rumble)
  if (clip.audio?.highPass && clip.audio.highPass > 20) {
    const hpFilter = offlineCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(clip.audio.highPass, clip.startTime);
    lastNode.connect(hpFilter);
    lastNode = hpFilter;
  }

  // 3. Low-Pass Filter (Remove high hiss)
  if (clip.audio?.lowPass && clip.audio.lowPass < 20000) {
    const lpFilter = offlineCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.setValueAtTime(clip.audio.lowPass, clip.startTime);
    lastNode.connect(lpFilter);
    lastNode = lpFilter;
  }

  // 4. Stereo Panner (-1.0 to +1.0)
  if (clip.audio?.pan !== undefined && clip.audio.pan !== 0) {
    const panVal = Math.max(-1, Math.min(1, clip.audio.pan / 100));
    if (typeof offlineCtx.createStereoPanner === 'function') {
      const panner = offlineCtx.createStereoPanner();
      panner.pan.setValueAtTime(panVal, clip.startTime);
      lastNode.connect(panner);
      lastNode = panner;
    } else {
      const panner = offlineCtx.createPanner();
      panner.panningModel = 'equalpower';
      panner.setPosition(panVal, 0, 1 - Math.abs(panVal));
      lastNode.connect(panner);
      lastNode = panner;
    }
  }

  // 5. Connect to Offline Context Destination
  lastNode.connect(offlineCtx.destination);
}
