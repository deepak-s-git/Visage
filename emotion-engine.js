(() => {
  const FACE_API_MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createEmotionEngine({ emotionProfiles, onState, onResult, onDebug }) {
    let modelReady = false;
    let loopHandle = null;
    let running = false;
    let smoothedAffect = { initialized: false, valence: 0, arousal: 0 };

    function emitState(state) {
      if (typeof onState === 'function') onState(state);
    }

    function emitDebug(payload) {
      if (typeof onDebug === 'function') onDebug(payload);
    }

    async function ensureEmotionModelLoaded() {
      if (modelReady) return true;
      if (!window.faceapi) throw new Error('faceapi_missing');
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(FACE_API_MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(FACE_API_MODEL_URL)
      ]);
      modelReady = true;
      return true;
    }

    function classifyEmotionFromExpressions(expressions, valence, arousal) {
      const dominant = Object.entries(expressions || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
      if (dominant === 'happy') return arousal > 0.45 ? emotionProfiles.fervent : emotionProfiles.luminous;
      if (dominant === 'surprised') return emotionProfiles.fervent;
      if (dominant === 'angry' || dominant === 'fearful' || dominant === 'disgusted') return emotionProfiles.restless;
      if (dominant === 'sad') return valence < -0.45 ? emotionProfiles.pensive : emotionProfiles.wistful;
      if (dominant === 'neutral') return arousal < -0.15 ? emotionProfiles.serene : emotionProfiles.wistful;
      return emotionProfiles.wistful;
    }

    function deriveEmotionResultFromExpressions(expressions) {
      const happy = expressions.happy || 0;
      const neutral = expressions.neutral || 0;
      const sad = expressions.sad || 0;
      const angry = expressions.angry || 0;
      const fearful = expressions.fearful || 0;
      const disgusted = expressions.disgusted || 0;
      const surprised = expressions.surprised || 0;
      const tension = clamp(angry + fearful + (disgusted * 0.8), 0, 1);

      const rawValence = clamp(
        (happy * 0.95) + (surprised * 0.2) + (neutral * 0.12) - (sad * 0.75) - (angry * 0.82) - (fearful * 0.72) - (disgusted * 0.66),
        -1,
        1
      );
      const rawArousal = clamp(
        (surprised * 0.92) + (angry * 0.68) + (fearful * 0.72) + (happy * 0.45) - (neutral * 0.3) - (sad * 0.3),
        -1,
        1
      );

      if (!smoothedAffect.initialized) {
        smoothedAffect = { initialized: true, valence: rawValence, arousal: rawArousal };
      } else {
        const alpha = 0.35;
        smoothedAffect.valence = smoothedAffect.valence + ((rawValence - smoothedAffect.valence) * alpha);
        smoothedAffect.arousal = smoothedAffect.arousal + ((rawArousal - smoothedAffect.arousal) * alpha);
      }

      const profile = classifyEmotionFromExpressions(expressions, smoothedAffect.valence, smoothedAffect.arousal);
      const confidence = Math.round(clamp(Math.max(...Object.values(expressions)) * 100, 0, 99));
      return {
        ...profile,
        valence: smoothedAffect.valence,
        arousal: smoothedAffect.arousal,
        confidence,
        debug: { happy, neutral, tension }
      };
    }

    async function processLoop(video) {
      if (!running) return;
      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceExpressions();

        if (!running) return;
        if (!detection || !detection.expressions) {
          emitState('analyzing');
          emitDebug({ state: 'analyzing' });
        } else {
          const result = deriveEmotionResultFromExpressions(detection.expressions);
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
      } catch (_err) {
        stop();
        emitState('awaiting');
        return;
      }

      loopHandle = window.setTimeout(() => {
        requestAnimationFrame(() => processLoop(video));
      }, 140);
    }

    async function start(video) {
      await ensureEmotionModelLoaded();
      running = true;
      smoothedAffect = { initialized: false, valence: 0, arousal: 0 };
      emitState('analyzing');
      processLoop(video);
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
})();
