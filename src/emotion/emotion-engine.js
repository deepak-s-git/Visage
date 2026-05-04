let FaceLandmarker;
let FilesetResolver;

const WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

/* ── Helpers ── */
function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function avg(...vals) {
  let sum = 0;
  let count = 0;
  for (const v of vals) {
    sum += v || 0;
    count++;
  }
  return count ? sum / count : 0;
}

/* ── Blendshape → Emotion Mapping ── */
function blendshapesToEmotions(categories) {
  // Convert array [{categoryName, score}] → map
  const bs = {};
  for (const c of categories) {
    bs[c.categoryName] = c.score;
  }

  const happy =
    avg(bs.mouthSmileLeft, bs.mouthSmileRight) * 0.55 +
    avg(bs.cheekSquintLeft, bs.cheekSquintRight) * 0.35 +
    (bs.cheekPuff || 0) * 0.1;

  const sad =
    avg(bs.mouthFrownLeft, bs.mouthFrownRight) * 0.45 +
    (bs.browInnerUp || 0) * 0.30 +
    clamp(1 - avg(bs.mouthSmileLeft, bs.mouthSmileRight), 0, 1) * 0.10 +
    avg(bs.mouthLowerDownLeft, bs.mouthLowerDownRight) * 0.15;

  const angry =
    avg(bs.browDownLeft, bs.browDownRight) * 0.45 +
    avg(bs.mouthPressLeft, bs.mouthPressRight) * 0.25 +
    (bs.jawForward || 0) * 0.15 +
    avg(bs.eyeSquintLeft, bs.eyeSquintRight) * 0.15;

  const surprised =
    avg(bs.eyeWideLeft, bs.eyeWideRight) * 0.35 +
    (bs.jawOpen || 0) * 0.35 +
    avg(bs.browOuterUpLeft, bs.browOuterUpRight) * 0.30;

  const disgusted =
    avg(bs.noseSneerLeft, bs.noseSneerRight) * 0.55 +
    (bs.mouthShrugUpper || 0) * 0.25 +
    avg(bs.mouthUpperUpLeft, bs.mouthUpperUpRight) * 0.20;

  const fearful =
    (bs.browInnerUp || 0) * 0.25 +
    avg(bs.eyeWideLeft, bs.eyeWideRight) * 0.35 +
    avg(bs.mouthStretchLeft, bs.mouthStretchRight) * 0.25 +
    (bs.jawOpen || 0) * 0.15;

  // Neutral is inversely proportional to how expressive the face is
  const peak = Math.max(happy, sad, angry, surprised, disgusted, fearful);
  const neutral = clamp(1 - peak * 2, 0, 1);

  return { happy, neutral, sad, angry, fearful, disgusted, surprised };
}

/* ── Engine Factory ── */
function createEmotionEngine({ emotionProfiles, onState, onResult, onDebug }) {
  let faceLandmarker = null;
  let running = false;
  let loopHandle = null;
  let smoothedAffect = { initialized: false, valence: 0, arousal: 0 };
  let noFaceFrames = 0;
  let lastTimestamp = -1;

  function emitState(state) {
    if (typeof onState === 'function') onState(state);
  }

  function emitDebug(payload) {
    if (typeof onDebug === 'function') onDebug(payload);
  }

  /* ── Model Loading (GPU → CPU fallback) ── */
  async function ensureEmotionModelLoaded() {
    if (faceLandmarker) return true;

    // Dynamic import — resolved by the importmap in index.html
    if (!FaceLandmarker) {
      const vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs');
      FaceLandmarker = vision.FaceLandmarker;
      FilesetResolver = vision.FilesetResolver;
    }
    const vision = await FilesetResolver.forVisionTasks(WASM_URL);

    const options = {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO',
      numFaces: 1
    };

    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, options);
    } catch (_gpuError) {
      // GPU delegate may fail on some devices — fall back to CPU
      options.baseOptions.delegate = 'CPU';
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, options);
    }

    return true;
  }

  /* ── Classify: pick the dominant emotion directly ── */
  function classifyEmotionFromExpressions(expressions) {
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);
    const dominant = sorted[0]?.[0] || 'neutral';
    return emotionProfiles[dominant] || emotionProfiles.neutral;
  }

  /* ── Derive valence / arousal / profile from expression scores ── */
  function deriveEmotionResult(expressions) {
    const { happy, neutral, sad, angry, fearful, disgusted, surprised } =
      expressions;
    const tension = clamp(angry + fearful + disgusted * 0.8, 0, 1);

    const rawValence = clamp(
      happy * 0.95 +
        surprised * 0.2 +
        neutral * 0.12 -
        sad * 0.75 -
        angry * 0.82 -
        fearful * 0.72 -
        disgusted * 0.66,
      -1,
      1
    );
    const rawArousal = clamp(
      surprised * 0.92 +
        angry * 0.68 +
        fearful * 0.72 +
        happy * 0.45 -
        neutral * 0.3 -
        sad * 0.3,
      -1,
      1
    );

    if (!smoothedAffect.initialized) {
      smoothedAffect = {
        initialized: true,
        valence: rawValence,
        arousal: rawArousal
      };
    } else {
      const alpha = 0.35;
      smoothedAffect.valence +=
        (rawValence - smoothedAffect.valence) * alpha;
      smoothedAffect.arousal +=
        (rawArousal - smoothedAffect.arousal) * alpha;
    }

    const profile = classifyEmotionFromExpressions(expressions);
    const confidence = Math.round(
      clamp(Math.max(...Object.values(expressions)) * 100, 0, 99)
    );

    return {
      ...profile,
      valence: smoothedAffect.valence,
      arousal: smoothedAffect.arousal,
      confidence,
      debug: { happy, neutral, tension }
    };
  }

  /* ── Real-time detection loop ── */
  function processFrame(video) {
    if (!running || !faceLandmarker) return;

    const now = performance.now();
    // MediaPipe requires strictly increasing timestamps
    if (now <= lastTimestamp) {
      loopHandle = window.setTimeout(() => processFrame(video), 16);
      return;
    }
    lastTimestamp = now;

    try {
      const results = faceLandmarker.detectForVideo(video, now);

      if (!running) return;

      if (
        !results.faceBlendshapes ||
        results.faceBlendshapes.length === 0
      ) {
        noFaceFrames += 1;
        const nextState = noFaceFrames >= 8 ? 'searching' : 'analyzing';
        emitState(nextState);
        emitDebug({ state: nextState, happy: 0, neutral: 0, tension: 0 });
      } else {
        noFaceFrames = 0;
        const expressions = blendshapesToEmotions(
          results.faceBlendshapes[0].categories
        );
        const result = deriveEmotionResult(expressions);
        if (typeof onResult === 'function') onResult(result);
        emitState('detected');
        emitDebug({
          state: 'detected',
          happy: result.debug.happy,
          neutral: result.debug.neutral,
          tension: result.debug.tension,
          valence: result.valence,
          arousal: result.arousal,
          confidence: result.confidence
        });
      }
    } catch (err) {
      console.error('MediaPipe detection error:', err);
      stop();
      emitState('awaiting');
      return;
    }

    // ~7 fps — prevents page unresponsive when running alongside 3D scene
    loopHandle = window.setTimeout(() => {
      requestAnimationFrame(() => processFrame(video));
    }, 150);
  }

  /* ── Public API ── */
  async function start(video) {
    await ensureEmotionModelLoaded();
    running = true;
    noFaceFrames = 0;
    lastTimestamp = -1;
    smoothedAffect = { initialized: false, valence: 0, arousal: 0 };
    emitState('analyzing');
    processFrame(video);
  }

  function stop() {
    running = false;
    if (loopHandle) {
      clearTimeout(loopHandle);
      loopHandle = null;
    }
    emitState('awaiting');
  }

  function isRunning() {
    return running;
  }

  return { start, stop, isRunning, ensureEmotionModelLoaded };
}

window.createEmotionEngine = createEmotionEngine;
