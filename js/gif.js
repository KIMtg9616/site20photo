import { CONFIG } from "./config.js";

import {
  renderCompositeFrame
} from "./capture.js";


/* ============================================================
   gifenc 지연 로딩

   GIF 버튼을 실제로 사용할 때만 약 9KB 정도의 인코더를 불러옵니다.
   ============================================================ */

let gifEncoderModulePromise =
  null;


async function getGifEncoderModule() {

  if (!gifEncoderModulePromise) {

    gifEncoderModulePromise =
      import(
        "https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js"
      );

  }

  return await gifEncoderModulePromise;

}


/* ============================================================
   GIF 녹화기
   ============================================================ */

export class GifRecorder {

  constructor(
    videoElement,
    layers = {}
  ) {

    this.videoElement =
      videoElement;

    this.layers =
      layers;

    this.width =
      CONFIG.gif?.width ||
      480;

    this.height =
      CONFIG.gif?.height ||
      360;

    this.fps =
      CONFIG.gif?.fps ||
      8;

    this.maxDurationMs =
      CONFIG.gif?.maxDurationMs ||
      3000;

    this.colors =
      CONFIG.gif?.colors ||
      128;

    this.frameInterval =
      1000 /
      this.fps;

    this.canvas =
      document.createElement(
        "canvas"
      );

    this.canvas.width =
      this.width;

    this.canvas.height =
      this.height;

    this.context =
      this.canvas.getContext(
        "2d",
        {
          alpha: false,
          willReadFrequently: true
        }
      );

    this.frames = [];

    this.recording =
      false;

    this.startedAt =
      0;

    this.lastCapturedAt =
      -Infinity;

    this.animationFrameId =
      null;

  }


  /* ========================================================
     녹화 시작
     ======================================================== */

  start() {

    if (this.recording) {
      return;
    }

    this.frames = [];

    this.recording =
      true;

    this.startedAt =
      performance.now();

    this.lastCapturedAt =
      -Infinity;

    /*
      누르는 순간 첫 프레임을 바로 저장합니다.
    */
    this.captureFrame(
      this.startedAt
    );


    const loop =
      now => {

        if (!this.recording) {
          return;
        }

        const elapsed =
          now -
          this.startedAt;

        if (
          elapsed >=
          this.maxDurationMs
        ) {
          return;
        }

        if (
          now -
          this.lastCapturedAt >=
          this.frameInterval
        ) {

          this.captureFrame(
            now
          );

        }

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


  /* ========================================================
     한 프레임 저장
     ======================================================== */

  captureFrame(now = performance.now()) {

    try {

      renderCompositeFrame(
        this.videoElement,
        this.canvas,
        this.layers,
        this.width,
        this.height
      );

      const imageData =
        this.context.getImageData(
          0,
          0,
          this.width,
          this.height
        );

      /*
        다음 프레임에서 Canvas가 바뀌어도 영향을 받지 않도록
        RGBA 배열을 복사해 보관합니다.
      */
      this.frames.push(
        new Uint8ClampedArray(
          imageData.data
        )
      );

      this.lastCapturedAt =
        now;

    }
    catch (error) {

      console.error(
        "GIF 프레임 캡처 오류:",
        error
      );

    }

  }


  /* ========================================================
     녹화 종료 및 GIF 인코딩
     ======================================================== */

  async stop(
    requestedDurationMs
  ) {

    if (!this.recording) {

      return null;

    }

    this.recording =
      false;

    if (this.animationFrameId) {

      cancelAnimationFrame(
        this.animationFrameId
      );

      this.animationFrameId =
        null;

    }


    const actualDurationMs =
      Math.max(
        0,
        Math.min(
          requestedDurationMs,
          this.maxDurationMs
        )
      );


    /*
      마지막 프레임이 너무 오래 전이라면
      버튼을 놓는 순간의 화면을 한 번 더 담습니다.
    */
    if (
      performance.now() -
      this.lastCapturedAt >
      this.frameInterval * 0.45
    ) {

      this.captureFrame();

    }


    /*
      아주 짧게 탭한 경우에도 GIF 파일을 만들 수 있도록
      최소 1프레임은 보장합니다.
    */
    if (
      this.frames.length === 0
    ) {

      this.captureFrame();

    }


    return await this.encode(
      actualDurationMs
    );

  }


  /* ========================================================
     GIF 인코딩
     ======================================================== */

  async encode(durationMs) {

    const {
      GIFEncoder,
      quantize,
      applyPalette
    } =
      await getGifEncoderModule();


    const gif =
      GIFEncoder();


    const frameCount =
      Math.max(
        1,
        this.frames.length
      );


    /*
      누른 시간에 최대한 가깝게 맞추기 위해
      실제 누른 시간 ÷ 프레임 수를 프레임 지연시간으로 사용합니다.

      GIF는 너무 짧은 지연시간을 일부 브라우저가 무시할 수 있어
      최소 40ms로 제한합니다.
    */
    const frameDelay =
      Math.max(
        40,
        Math.round(
          Math.max(
            durationMs,
            80
          ) /
          frameCount /
          10
        ) * 10
      );


    for (
      let index = 0;
      index < this.frames.length;
      index += 1
    ) {

      const rgba =
        this.frames[index];

      const palette =
        quantize(
          rgba,
          this.colors
        );

      const indexedPixels =
        applyPalette(
          rgba,
          palette
        );

      const options = {
        palette,
        delay: frameDelay
      };

      if (index === 0) {
        options.repeat = 0;
      }

      gif.writeFrame(
        indexedPixels,
        this.width,
        this.height,
        options
      );

    }


    gif.finish();


    const bytes =
      gif.bytes();


    const blob =
      new Blob(
        [bytes],
        {
          type: "image/gif"
        }
      );


    const result = {
      blob,
      durationMs,
      frameCount: this.frames.length,
      width: this.width,
      height: this.height
    };


    /*
      메모리 회수
    */
    this.frames = [];


    return result;

  }


  isRecording() {

    return this.recording;

  }

}
