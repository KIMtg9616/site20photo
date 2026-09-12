import { CONFIG } from "./config.js";

import {
  renderCompositeFrame
} from "./capture.js";


/* ============================================================
   gifenc 지연 로딩
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
   Animated WebP 프레임 디코더
   ============================================================

   기존 방식은 DOM의 <img>를 Canvas에 drawImage() 했습니다.
   일부 브라우저에서는 Animated WebP가 첫 프레임으로만 캡처되어
   GIF 결과에서 움직이는 효과가 멈춰 보일 수 있습니다.

   이 클래스는 브라우저가 ImageDecoder(WebCodecs)를 지원하는 경우
   Animated WebP의 각 프레임을 직접 해석하여 GIF 녹화 시간에 맞는
   프레임을 Canvas에 전달합니다.

   ImageDecoder를 지원하지 않는 브라우저에서는 기존 DOM <img>
   캡처 방식으로 자동 폴백합니다.
   ============================================================ */

class AnimatedLayerDecoder {

  constructor(
    element,
    stageElement,
    outputWidth,
    outputHeight,
    kind = "background"
  ) {

    this.element =
      element;

    this.stageElement =
      stageElement;

    this.outputWidth =
      outputWidth;

    this.outputHeight =
      outputHeight;

    this.kind =
      kind;

    this.sourceUrl =
      "";

    this.animation =
      null;

    this.loadingPromise =
      null;

    this.loadToken =
      0;

    this.observer =
      null;


    this.observe();

  }


  /* ========================================================
     DOM 레이어 변경 감시
     ======================================================== */

  observe() {

    if (!this.element) {
      return;
    }


    this.element.addEventListener(
      "load",
      () => {
        this.refresh();
      }
    );


    if (
      typeof MutationObserver !==
      "undefined"
    ) {

      this.observer =
        new MutationObserver(
          () => {
            this.refresh();
          }
        );


      this.observer.observe(
        this.element,
        {
          attributes: true,
          attributeFilter: [
            "src",
            "style",
            "class"
          ]
        }
      );

    }

  }


  isElementVisible() {

    if (!this.element) {
      return false;
    }


    const style =
      window.getComputedStyle(
        this.element
      );


    return !(
      style.display === "none" ||
      style.visibility === "hidden" ||
      Number(style.opacity) === 0
    );

  }


  getElementSource() {

    if (!this.element) {
      return "";
    }


    return (
      this.element.currentSrc ||
      this.element.src ||
      ""
    );

  }


  /* ========================================================
     현재 Animated WebP 미리 디코딩
     ======================================================== */

  refresh() {

    const src =
      this.getElementSource();


    if (
      !src ||
      !this.isElementVisible()
    ) {

      this.sourceUrl =
        "";

      this.loadingPromise =
        null;

      this.disposeAnimation();

      return;

    }


    if (
      src === this.sourceUrl &&
      (
        this.animation ||
        this.loadingPromise
      )
    ) {
      return;
    }


    this.sourceUrl =
      src;


    const token =
      ++this.loadToken;


    this.disposeAnimation();


    /*
      ImageDecoder가 없으면 DOM 이미지 캡처 방식으로 폴백합니다.
    */
    if (
      typeof globalThis.ImageDecoder ===
        "undefined" ||
      typeof globalThis.createImageBitmap ===
        "undefined"
    ) {

      this.loadingPromise =
        null;

      return;

    }


    this.loadingPromise =
      this.decodeSource(
        src
      )
        .then(
          animation => {

            if (
              token !==
              this.loadToken
            ) {

              this.closeAnimation(
                animation
              );

              return;

            }


            this.animation =
              animation;

          }
        )
        .catch(
          error => {

            /*
              디코딩 실패 시에도 GIF 촬영 자체는 계속 가능하며
              기존 DOM <img> 방식으로 자동 폴백합니다.
            */
            console.warn(
              "Animated WebP 프레임 디코딩 폴백:",
              error
            );

          }
        )
        .finally(
          () => {

            if (
              token ===
              this.loadToken
            ) {

              this.loadingPromise =
                null;

            }

          }
        );

  }


  /* ========================================================
     GIF 출력 크기에 맞는 디코딩 크기
     ======================================================== */

  getDecodeSize() {

    /* 전체 움직이는 배경 */
    if (
      this.kind ===
      "background"
    ) {

      return {
        width:
          this.outputWidth,
        height:
          this.outputHeight
      };

    }


    /* 움직이는 캐릭터 */
    const stageRect =
      this.stageElement
        ?.getBoundingClientRect();

    const elementRect =
      this.element
        ?.getBoundingClientRect();


    if (
      stageRect?.width > 0 &&
      stageRect?.height > 0 &&
      elementRect?.width > 0 &&
      elementRect?.height > 0
    ) {

      return {
        width:
          Math.max(
            1,
            Math.round(
              elementRect.width /
              stageRect.width *
              this.outputWidth
            )
          ),
        height:
          Math.max(
            1,
            Math.round(
              elementRect.height /
              stageRect.height *
              this.outputHeight
            )
          )
      };

    }


    return {
      width:
        Math.round(
          this.outputWidth *
          0.38
        ),
      height:
        Math.round(
          this.outputHeight *
          0.5
        )
    };

  }


  /* ========================================================
     실제 Animated WebP 디코딩
     ======================================================== */

  async decodeSource(src) {

    const response =
      await fetch(
        src,
        {
          cache: "force-cache"
        }
      );


    if (!response.ok) {

      throw new Error(
        `Animated WebP 로딩 실패: ${response.status}`
      );

    }


    const data =
      await response.arrayBuffer();


    const decoder =
      new globalThis.ImageDecoder({
        data:
          new Uint8Array(
            data
          ),
        type:
          "image/webp",
        preferAnimation:
          true
      });


    await decoder.tracks.ready;


    const track =
      decoder.tracks.selectedTrack;


    const frameCount =
      Math.max(
        1,
        Number(
          track?.frameCount ||
          1
        )
      );


    if (frameCount <= 1) {

      decoder.close();

      return null;

    }


    const targetSize =
      this.getDecodeSize();


    const resizeCanvas =
      document.createElement(
        "canvas"
      );


    resizeCanvas.width =
      targetSize.width;

    resizeCanvas.height =
      targetSize.height;


    const resizeContext =
      resizeCanvas.getContext(
        "2d",
        {
          alpha: true
        }
      );


    const frames =
      [];


    let totalDurationMs =
      0;


    for (
      let index = 0;
      index < frameCount;
      index += 1
    ) {

      const decoded =
        await decoder.decode({
          frameIndex:
            index,
          completeFramesOnly:
            true
        });


      const frame =
        decoded.image;


      resizeContext.clearRect(
        0,
        0,
        resizeCanvas.width,
        resizeCanvas.height
      );


      resizeContext.drawImage(
        frame,
        0,
        0,
        resizeCanvas.width,
        resizeCanvas.height
      );


      const bitmap =
        await createImageBitmap(
          resizeCanvas
        );


      const durationMicroseconds =
        Number(
          frame.duration
        );


      const durationMs =
        Number.isFinite(
          durationMicroseconds
        ) &&
        durationMicroseconds > 0
          ? durationMicroseconds /
            1000
          : 100;


      frames.push({
        bitmap,
        startMs:
          totalDurationMs,
        durationMs
      });


      totalDurationMs +=
        durationMs;


      if (
        typeof frame.close ===
        "function"
      ) {

        frame.close();

      }

    }


    decoder.close();


    return {
      src,
      frames,
      totalDurationMs:
        Math.max(
          totalDurationMs,
          frames.length * 100
        )
    };

  }


  /* ========================================================
     현재 녹화 시간에 해당하는 프레임 반환
     ======================================================== */

  getFrame(elapsedMs) {

    /*
      DOM 상태가 바뀌었는데 MutationObserver가 아직 실행되기 전일 수 있어
      녹화 시점에도 한 번 동기화합니다.
    */
    const src =
      this.getElementSource();


    if (
      src &&
      src !== this.sourceUrl
    ) {

      this.refresh();

    }


    const animation =
      this.animation;


    if (
      !animation ||
      !animation.frames?.length ||
      !animation.totalDurationMs
    ) {

      return null;

    }


    const loopTime =
      (
        Math.max(
          0,
          elapsedMs
        ) %
        animation.totalDurationMs
      );


    for (
      let index =
        animation.frames.length - 1;
      index >= 0;
      index -= 1
    ) {

      const frame =
        animation.frames[index];


      if (
        loopTime >=
        frame.startMs
      ) {

        return frame.bitmap;

      }

    }


    return (
      animation.frames[0]
        ?.bitmap ||
      null
    );

  }


  closeAnimation(animation) {

    if (
      !animation ||
      !Array.isArray(
        animation.frames
      )
    ) {
      return;
    }


    animation.frames.forEach(
      frame => {

        try {

          frame.bitmap?.close?.();

        }
        catch (error) {
          /* 이미 닫힌 ImageBitmap이면 무시 */
        }

      }
    );

  }


  disposeAnimation() {

    this.closeAnimation(
      this.animation
    );


    this.animation =
      null;

  }

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


    /*
      움직이는 배경과 움직이는 캐릭터를 각각 미리 디코딩합니다.
      사용자가 효과를 고른 직후 MutationObserver가 작동하므로
      GIF 버튼을 누를 때 대부분 이미 준비된 상태가 됩니다.
    */
    this.animatedBackgroundDecoder =
      new AnimatedLayerDecoder(
        layers.animatedBackgroundOverlayElement,
        layers.cameraStageElement,
        this.width,
        this.height,
        "background"
      );


    this.animatedCharacterDecoder =
      new AnimatedLayerDecoder(
        layers.animatedCharacterOverlayElement,
        layers.cameraStageElement,
        this.width,
        this.height,
        "character"
      );

  }


  /* ========================================================
     녹화 시작
     ======================================================== */

  start() {

    if (this.recording) {
      return;
    }


    /* 녹화 직전 최신 src/display 상태를 다시 확인 */
    this.animatedBackgroundDecoder.refresh();
    this.animatedCharacterDecoder.refresh();


    this.frames = [];

    this.recording =
      true;

    this.startedAt =
      performance.now();

    this.lastCapturedAt =
      -Infinity;


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

  captureFrame(
    now = performance.now()
  ) {

    try {

      const elapsedMs =
        Math.max(
          0,
          now -
          this.startedAt
        );


      const animatedFrameOverrides = {

        background:
          this.animatedBackgroundDecoder
            .getFrame(
              elapsedMs
            ),

        character:
          this.animatedCharacterDecoder
            .getFrame(
              elapsedMs
            )

      };


      renderCompositeFrame(
        this.videoElement,
        this.canvas,
        this.layers,
        this.width,
        this.height,
        animatedFrameOverrides
      );


      const imageData =
        this.context.getImageData(
          0,
          0,
          this.width,
          this.height
        );


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


    if (
      performance.now() -
      this.lastCapturedAt >
      this.frameInterval * 0.45
    ) {

      this.captureFrame();

    }


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
      frameCount:
        this.frames.length,
      width:
        this.width,
      height:
        this.height
    };


    this.frames = [];


    return result;

  }


  isRecording() {

    return this.recording;

  }

}
