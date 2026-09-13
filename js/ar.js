import {
  getCurrentFacingMode
} from "./camera.js";


/*
 ============================================================
 얼굴인식 AR 관리자
 ============================================================

 - AR 모드를 실제로 선택했을 때만 MediaPipe를 지연 로딩합니다.
 - 선택하지 않으면 모델/wasm 데이터를 내려받지 않습니다.
 - 최대 3명의 얼굴을 동시에 추적합니다.
 - 얼굴 위치/크기/회전값을 보간해 AR 떨림을 줄입니다.
 - 얼굴을 순간적으로 놓쳐도 약 0.26초 동안 마지막 AR 위치를 유지합니다.
 - 화면 회전/크기 변경 시 Canvas와 추적 좌표를 다시 맞춥니다.
*/

export class ARTracker {

  constructor(
    videoElement,
    stageElement,
    canvasElement,
    onFaceCountChange = null
  ) {

    this.videoElement =
      videoElement;

    this.stageElement =
      stageElement;

    this.canvasElement =
      canvasElement;

    this.context =
      canvasElement.getContext("2d");

    this.faceLandmarker =
      null;

    this.loadingPromise =
      null;

    this.selectedEffect =
      null;

    this.effectImage =
      null;

    this.running =
      false;

    this.animationFrameId =
      null;

    this.lastVideoTime =
      -1;

    this.effectRequestId =
      0;

    /* 최대 동시 얼굴 수 */
    this.maxFaces =
      3;

    /*
      흔들림 완화 계수

      값이 작을수록 더 부드럽지만 반응이 느려지고,
      값이 클수록 얼굴 움직임을 빠르게 따라갑니다.
    */
    this.positionSmoothing =
      0.38;

    this.sizeSmoothing =
      0.32;

    this.angleSmoothing =
      0.30;

    /* 순간적인 얼굴 검출 실패 시 마지막 위치 유지 시간 */
    this.trackingHoldMs =
      260;

    /* 여러 얼굴을 프레임 사이에서 이어 붙이기 위한 상태 */
    this.faceTracks =
      [];

    this.nextTrackId =
      1;

    this.lastFaceCount =
      -1;

    this.faceCountActive =
      false;

    this.onFaceCountChange =
      typeof onFaceCountChange === "function"
        ? onFaceCountChange
        : null;

  }


  /* ========================================================
     MediaPipe Face Landmarker 지연 로딩
     ======================================================== */

  async ensureReady() {

    if (this.faceLandmarker) {
      return;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise =
      this.createFaceLandmarker();

    try {
      await this.loadingPromise;
    }
    finally {
      this.loadingPromise = null;
    }

  }


  async createFaceLandmarker() {

    const module =
      await import(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/+esm"
      );

    const vision =
      module.default || module;

    const {
      FaceLandmarker,
      FilesetResolver
    } = vision;

    const filesetResolver =
      await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
      );

    this.faceLandmarker =
      await FaceLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numFaces: this.maxFaces,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        }
      );

  }


  /* ========================================================
     얼굴 인식 인원 안내
     ======================================================== */

  notifyFaceCount(
    count,
    active = true
  ) {

    const safeCount =
      Math.max(
        0,
        Math.min(
          Number(count) || 0,
          this.maxFaces
        )
      );

    if (
      safeCount === this.lastFaceCount &&
      active === this.faceCountActive
    ) {
      return;
    }

    this.lastFaceCount =
      safeCount;

    this.faceCountActive =
      active;

    if (this.onFaceCountChange) {

      this.onFaceCountChange({
        count: safeCount,
        maxFaces: this.maxFaces,
        active
      });

    }

  }


  /* ========================================================
     AR 이미지 로딩
     ======================================================== */

  loadImage(src) {

    return new Promise(
      (resolve, reject) => {

        const image =
          new Image();

        image.onload =
          () => resolve(image);

        image.onerror =
          reject;

        image.src =
          src;

      }
    );

  }


  /* ========================================================
     AR 효과 적용
     ======================================================== */

  async setEffect(effect) {

    if (
      !effect ||
      !effect.src
    ) {

      this.clearEffect();
      return;

    }

    const requestId =
      ++this.effectRequestId;

    this.selectedEffect =
      effect;

    const loadedImage =
      await this.loadImage(
        effect.src
      );

    if (
      requestId !==
      this.effectRequestId
    ) {
      return;
    }

    await this.ensureReady();

    if (
      requestId !==
      this.effectRequestId
    ) {
      return;
    }

    this.effectImage =
      loadedImage;

    this.resetTrackingState();

    this.resizeCanvas();

    this.canvasElement.style.display =
      "block";

    this.running =
      true;

    this.notifyFaceCount(
      0,
      true
    );

    this.lastVideoTime =
      -1;

    this.startLoop();

  }


  /* ========================================================
     AR 해제
     ======================================================== */

  clearEffect() {

    this.effectRequestId +=
      1;

    this.running =
      false;

    this.selectedEffect =
      null;

    this.effectImage =
      null;

    if (this.animationFrameId) {

      cancelAnimationFrame(
        this.animationFrameId
      );

      this.animationFrameId =
        null;

    }

    this.resetTrackingState();

    this.notifyFaceCount(
      0,
      false
    );

    this.clearCanvas();

    this.canvasElement.style.display =
      "none";

  }


  /* ========================================================
     추적 상태 초기화
     ======================================================== */

  resetTrackingState() {

    this.faceTracks =
      [];

    this.nextTrackId =
      1;

  }


  /* ========================================================
     화면 회전 / 크기 변경 대응
     ======================================================== */

  refreshLayout(
    forceReset = false
  ) {

    const changed =
      this.resizeCanvas();

    if (
      changed ||
      forceReset
    ) {

      this.resetTrackingState();

    }

    this.lastVideoTime =
      -1;

  }


  /* ========================================================
     Canvas 크기 조절
     ======================================================== */

  resizeCanvas() {

    const rect =
      this.stageElement.getBoundingClientRect();

    /*
      모바일 GPU 부담을 줄이기 위해 DPR은 최대 2까지만 사용합니다.
    */
    const dpr =
      Math.min(
        window.devicePixelRatio || 1,
        2
      );

    const width =
      Math.max(
        1,
        Math.round(
          rect.width * dpr
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          rect.height * dpr
        )
      );

    const changed =
      this.canvasElement.width !== width ||
      this.canvasElement.height !== height;

    if (changed) {

      this.canvasElement.width =
        width;

      this.canvasElement.height =
        height;

    }

    return changed;

  }


  clearCanvas() {

    this.context.clearRect(
      0,
      0,
      this.canvasElement.width,
      this.canvasElement.height
    );

  }


  /* ========================================================
     얼굴 추적 반복
     ======================================================== */

  startLoop() {

    if (!this.running) {
      return;
    }

    if (this.animationFrameId) {
      cancelAnimationFrame(
        this.animationFrameId
      );
    }

    const loop =
      () => {

        if (!this.running) {
          return;
        }

        this.renderFrame();

        this.animationFrameId =
          requestAnimationFrame(
            loop
          );

      };

    this.animationFrameId =
      requestAnimationFrame(
        loop
      );

  }


  renderFrame() {

    if (
      !this.faceLandmarker ||
      !this.selectedEffect ||
      !this.effectImage ||
      this.videoElement.readyState < 2
    ) {

      this.clearCanvas();
      return;

    }

    /* 같은 비디오 프레임을 반복 분석하지 않습니다. */
    if (
      this.videoElement.currentTime ===
      this.lastVideoTime
    ) {
      return;
    }

    this.lastVideoTime =
      this.videoElement.currentTime;

    const canvasChanged =
      this.resizeCanvas();

    if (canvasChanged) {
      this.resetTrackingState();
    }

    const now =
      performance.now();

    const result =
      this.faceLandmarker.detectForVideo(
        this.videoElement,
        now
      );

    const faceLandmarks =
      Array.isArray(
        result.faceLandmarks
      )
        ? result.faceLandmarks.slice(
            0,
            this.maxFaces
          )
        : [];

    /*
      얼굴 인원 표시는 실제 현재 검출 수를 사용합니다.
      AR 이미지 자체는 잠깐 검출이 끊겨도 trackingHoldMs 동안 유지됩니다.
    */
    this.notifyFaceCount(
      faceLandmarks.length,
      true
    );

    const rawTransforms =
      faceLandmarks
        .map(
          landmarks =>
            this.calculateEffectTransform(
              landmarks
            )
        )
        .filter(Boolean);

    this.updateFaceTracks(
      rawTransforms,
      now
    );

    this.clearCanvas();

    for (
      const track
      of this.faceTracks
    ) {

      this.drawTrack(
        track
      );

    }

  }


  /* ========================================================
     MediaPipe 좌표 → 현재 카메라 화면 좌표
     ======================================================== */

  landmarkToCanvas(landmark) {

    const stageWidth =
      this.canvasElement.width;

    const stageHeight =
      this.canvasElement.height;

    const videoWidth =
      this.videoElement.videoWidth;

    const videoHeight =
      this.videoElement.videoHeight;

    if (
      !videoWidth ||
      !videoHeight ||
      !landmark
    ) {

      return {
        x: 0,
        y: 0
      };

    }

    /* CSS object-fit: cover와 같은 계산 */
    const scale =
      Math.max(
        stageWidth / videoWidth,
        stageHeight / videoHeight
      );

    const renderedWidth =
      videoWidth * scale;

    const renderedHeight =
      videoHeight * scale;

    const offsetX =
      (
        stageWidth -
        renderedWidth
      ) / 2;

    const offsetY =
      (
        stageHeight -
        renderedHeight
      ) / 2;

    let x =
      offsetX +
      (
        landmark.x *
        renderedWidth
      );

    const y =
      offsetY +
      (
        landmark.y *
        renderedHeight
      );

    /* 전면 카메라 화면 미러링에 맞춰 AR 좌표도 반전 */
    if (
      getCurrentFacingMode() ===
      "user"
    ) {

      x =
        stageWidth - x;

    }

    return {
      x,
      y
    };

  }


  /* ========================================================
     얼굴 랜드마크 → AR 배치값 계산
     ======================================================== */

  calculateEffectTransform(
    landmarks
  ) {

    const effect =
      this.selectedEffect;

    const image =
      this.effectImage;

    if (
      !effect ||
      !image ||
      !landmarks ||
      landmarks.length < 455
    ) {
      return null;
    }

    const eyeA =
      this.landmarkToCanvas(
        landmarks[33]
      );

    const eyeB =
      this.landmarkToCanvas(
        landmarks[263]
      );

    const cheekA =
      this.landmarkToCanvas(
        landmarks[234]
      );

    const cheekB =
      this.landmarkToCanvas(
        landmarks[454]
      );

    const forehead =
      this.landmarkToCanvas(
        landmarks[10]
      );

    const chin =
      this.landmarkToCanvas(
        landmarks[152]
      );

    const eyeDistance =
      Math.hypot(
        eyeB.x - eyeA.x,
        eyeB.y - eyeA.y
      );

    const faceWidth =
      Math.hypot(
        cheekB.x - cheekA.x,
        cheekB.y - cheekA.y
      );

    const faceHeight =
      Math.hypot(
        chin.x - forehead.x,
        chin.y - forehead.y
      );

    if (
      !Number.isFinite(faceWidth) ||
      faceWidth <= 0
    ) {
      return null;
    }

    const faceCenterX =
      (
        cheekA.x +
        cheekB.x
      ) / 2;

    const faceCenterY =
      (
        forehead.y +
        chin.y
      ) / 2;

    const eyeCenterX =
      (
        eyeA.x +
        eyeB.x
      ) / 2;

    const eyeCenterY =
      (
        eyeA.y +
        eyeB.y
      ) / 2;

    const isFrontCamera =
      getCurrentFacingMode() ===
      "user";

    /*
      전면 카메라는 landmark x 좌표가 이미 좌우 반전되므로
      반대 방향 벡터(B→A)를 사용해 AR 이미지의 회전을 바로잡습니다.
    */
    const angle =
      isFrontCamera
        ? Math.atan2(
            eyeA.y - eyeB.y,
            eyeA.x - eyeB.x
          )
        : Math.atan2(
            eyeB.y - eyeA.y,
            eyeB.x - eyeA.x
          );

    const aspect =
      image.naturalHeight /
      image.naturalWidth;

    let width;
    let height;
    let x;
    let y;

    if (
      effect.arKind ===
      "glasses"
    ) {

      width =
        eyeDistance *
        (
          effect.scale ||
          2.35
        );

      height =
        width * aspect;

      x =
        eyeCenterX;

      y =
        eyeCenterY +
        (
          height * 0.02
        );

    }

    else if (
      effect.arKind ===
      "crown"
    ) {

      width =
        faceWidth *
        (
          effect.scale ||
          1.45
        );

      height =
        width * aspect;

      x =
        faceCenterX;

      y =
        forehead.y -
        (
          height * 0.42
        );

    }

    else {

      width =
        faceWidth *
        (
          effect.scale ||
          1.65
        );

      height =
        width * aspect;

      x =
        faceCenterX;

      y =
        forehead.y +
        (
          faceHeight * 0.23
        );

    }

    return {
      x,
      y,
      width,
      height,
      angle,
      faceCenterX,
      faceCenterY,
      faceWidth
    };

  }


  /* ========================================================
     보간 유틸리티
     ======================================================== */

  lerp(
    previous,
    next,
    amount
  ) {

    return (
      previous +
      (
        next - previous
      ) * amount
    );

  }


  lerpAngle(
    previous,
    next,
    amount
  ) {

    let delta =
      next - previous;

    while (delta > Math.PI) {
      delta -= Math.PI * 2;
    }

    while (delta < -Math.PI) {
      delta += Math.PI * 2;
    }

    return (
      previous +
      delta * amount
    );

  }


  smoothTrack(
    track,
    raw,
    now
  ) {

    return {
      ...track,

      x:
        this.lerp(
          track.x,
          raw.x,
          this.positionSmoothing
        ),

      y:
        this.lerp(
          track.y,
          raw.y,
          this.positionSmoothing
        ),

      width:
        this.lerp(
          track.width,
          raw.width,
          this.sizeSmoothing
        ),

      height:
        this.lerp(
          track.height,
          raw.height,
          this.sizeSmoothing
        ),

      angle:
        this.lerpAngle(
          track.angle,
          raw.angle,
          this.angleSmoothing
        ),

      faceCenterX:
        this.lerp(
          track.faceCenterX,
          raw.faceCenterX,
          this.positionSmoothing
        ),

      faceCenterY:
        this.lerp(
          track.faceCenterY,
          raw.faceCenterY,
          this.positionSmoothing
        ),

      faceWidth:
        this.lerp(
          track.faceWidth,
          raw.faceWidth,
          this.sizeSmoothing
        ),

      lastSeenAt:
        now
    };

  }


  /* ========================================================
     3명 얼굴 트랙 유지 + 순간 끊김 보정
     ======================================================== */

  updateFaceTracks(
    rawTransforms,
    now
  ) {

    const previousTracks =
      this.faceTracks.filter(
        track =>
          (
            now -
            track.lastSeenAt
          ) <= this.trackingHoldMs
      );

    const usedTrackIds =
      new Set();

    const detectedTracks =
      [];

    for (
      const raw
      of rawTransforms
    ) {

      let bestTrack =
        null;

      let bestDistance =
        Infinity;

      for (
        const track
        of previousTracks
      ) {

        if (
          usedTrackIds.has(
            track.id
          )
        ) {
          continue;
        }

        const distance =
          Math.hypot(
            raw.faceCenterX -
              track.faceCenterX,
            raw.faceCenterY -
              track.faceCenterY
          );

        const matchDistance =
          Math.max(
            raw.faceWidth * 1.8,
            this.canvasElement.width * 0.18
          );

        if (
          distance < bestDistance &&
          distance <= matchDistance
        ) {

          bestDistance =
            distance;

          bestTrack =
            track;

        }

      }

      if (bestTrack) {

        usedTrackIds.add(
          bestTrack.id
        );

        detectedTracks.push(
          this.smoothTrack(
            bestTrack,
            raw,
            now
          )
        );

      }

      else {

        detectedTracks.push({
          id:
            this.nextTrackId++,
          ...raw,
          lastSeenAt:
            now
        });

      }

    }

    /*
      이번 프레임에서 잠깐 사라진 얼굴은 0.26초까지
      마지막 위치를 그대로 유지합니다.
    */
    const heldTracks =
      previousTracks.filter(
        track =>
          !usedTrackIds.has(
            track.id
          )
      );

    this.faceTracks =
      [
        ...detectedTracks,
        ...heldTracks
      ].slice(
        0,
        this.maxFaces
      );

  }


  /* ========================================================
     보간된 AR 효과 그리기
     ======================================================== */

  drawTrack(track) {

    const image =
      this.effectImage;

    if (
      !image ||
      !track ||
      !Number.isFinite(track.x) ||
      !Number.isFinite(track.y) ||
      !Number.isFinite(track.width) ||
      !Number.isFinite(track.height)
    ) {
      return;
    }

    this.context.save();

    this.context.translate(
      track.x,
      track.y
    );

    this.context.rotate(
      track.angle
    );

    this.context.drawImage(
      image,
      -track.width / 2,
      -track.height / 2,
      track.width,
      track.height
    );

    this.context.restore();

  }

}
