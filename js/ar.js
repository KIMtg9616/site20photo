import {
  getCurrentFacingMode
} from "./camera.js";


/*
 ============================================================
 얼굴인식 AR 관리자
 ============================================================

 - AR 모드를 실제로 선택했을 때만 MediaPipe를 지연 로딩합니다.
 - 선택하지 않으면 모델/wasm 데이터를 내려받지 않습니다.
 - AR 결과는 camera-stage 위의 Canvas에 그립니다.
*/

export class ARTracker {

  constructor(
    videoElement,
    stageElement,
    canvasElement
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
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        }
      );

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

    this.resizeCanvas();

    this.canvasElement.style.display =
      "block";

    this.running =
      true;

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

    this.clearCanvas();

    this.canvasElement.style.display =
      "none";

  }


  /* ========================================================
     Canvas 크기 조절
     ======================================================== */

  resizeCanvas() {

    const rect =
      this.stageElement.getBoundingClientRect();

    /*
      AR Canvas가 너무 커져 모바일 GPU 부담이 커지는 것을 막기 위해
      DPR은 최대 2까지만 사용합니다.
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

    if (
      this.canvasElement.width !== width ||
      this.canvasElement.height !== height
    ) {

      this.canvasElement.width =
        width;

      this.canvasElement.height =
        height;

    }

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

    /*
      같은 비디오 프레임을 반복 분석하지 않습니다.
    */
    if (
      this.videoElement.currentTime ===
      this.lastVideoTime
    ) {
      return;
    }

    this.lastVideoTime =
      this.videoElement.currentTime;

    this.resizeCanvas();

    const result =
      this.faceLandmarker.detectForVideo(
        this.videoElement,
        performance.now()
      );

    this.clearCanvas();

    if (
      !result.faceLandmarks ||
      result.faceLandmarks.length === 0
    ) {
      return;
    }

    const landmarks =
      result.faceLandmarks[0];

    this.drawEffect(
      landmarks
    );

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
      !videoHeight
    ) {

      return {
        x: 0,
        y: 0
      };

    }

    /*
      CSS의 object-fit: cover와 같은 계산입니다.
    */
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

    /*
      전면 카메라는 화면에서 좌우 반전되어 있으므로
      AR 좌표도 동일하게 반전합니다.
    */
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
     AR 그림 배치
     ======================================================== */

  drawEffect(landmarks) {

    const effect =
      this.selectedEffect;

    const image =
      this.effectImage;

    if (
      !effect ||
      !image
    ) {
      return;
    }

    /*
      주요 얼굴 랜드마크

      33 / 263 : 양쪽 눈 바깥쪽
      234 / 454: 양쪽 볼/얼굴 측면
      10       : 이마 위쪽
      152      : 턱 아래쪽
    */
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

    const centerX =
      (
        cheekA.x +
        cheekB.x
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

    /*
      전면 카메라에서는 landmark x 좌표를 이미 좌우 반전했기 때문에
      눈 A→B 방향을 그대로 사용하면 각도가 약 180도 뒤집혀
      AR 이미지가 거꾸로 보일 수 있습니다.

      전면 카메라는 반대 방향 벡터(B→A)를 사용해
      화면의 미러링과 같은 기울기만 유지합니다.
    */
    const isFrontCamera =
      getCurrentFacingMode() ===
      "user";

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


    /* --------------------------------------------------------
       안경
       -------------------------------------------------------- */
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


    /* --------------------------------------------------------
       왕관
       -------------------------------------------------------- */
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
        centerX;

      y =
        forehead.y -
        (
          height * 0.42
        );

    }


    /* --------------------------------------------------------
       머리띠
       -------------------------------------------------------- */
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
        centerX;

      y =
        forehead.y +
        (
          faceHeight * 0.23
        );

    }


    this.context.save();

    this.context.translate(
      x,
      y
    );

    this.context.rotate(
      angle
    );

    this.context.drawImage(
      image,
      -width / 2,
      -height / 2,
      width,
      height
    );

    this.context.restore();

  }

}
