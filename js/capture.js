import { CONFIG } from "./config.js";


/*
 ============================================================
 원본 카메라 영상을 4:3으로 중앙 크롭하기 위한 계산
 ============================================================
*/

function calculateCrop(
  sourceWidth,
  sourceHeight,
  targetAspectRatio
) {

  const sourceAspectRatio =
    sourceWidth / sourceHeight;

  let sx = 0;
  let sy = 0;

  let sw = sourceWidth;
  let sh = sourceHeight;

  if (
    sourceAspectRatio >
    targetAspectRatio
  ) {

    sw =
      sourceHeight *
      targetAspectRatio;

    sx =
      (
        sourceWidth -
        sw
      ) / 2;

  }

  else if (
    sourceAspectRatio <
    targetAspectRatio
  ) {

    sh =
      sourceWidth /
      targetAspectRatio;

    sy =
      (
        sourceHeight -
        sh
      ) / 2;

  }

  return {
    sx,
    sy,
    sw,
    sh
  };

}


/* ============================================================
   DOM 이미지 레이어가 실제로 화면에 보이는지 확인
   ============================================================ */

function isVisibleElement(element) {

  if (!element) {
    return false;
  }

  const style =
    window.getComputedStyle(
      element
    );

  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    Number(style.opacity) === 0
  ) {
    return false;
  }

  const rect =
    element.getBoundingClientRect();

  return (
    rect.width > 0 &&
    rect.height > 0
  );

}


/* ============================================================
   현재 화면에 표시 중인 img 레이어를 Canvas에 그대로 그리기

   - 정적 이미지
   - Animated WebP의 현재 프레임
   모두 같은 방식으로 처리합니다.
   ============================================================ */

function drawImageOverlay(
  context,
  element,
  stageElement,
  outputWidth,
  outputHeight
) {

  if (
    !isVisibleElement(element) ||
    !element.complete ||
    !element.naturalWidth ||
    !element.naturalHeight
  ) {
    return;
  }

  const stageRect =
    stageElement.getBoundingClientRect();

  const rect =
    element.getBoundingClientRect();

  if (
    !stageRect.width ||
    !stageRect.height
  ) {
    return;
  }

  const scaleX =
    outputWidth /
    stageRect.width;

  const scaleY =
    outputHeight /
    stageRect.height;

  const x =
    (
      rect.left -
      stageRect.left
    ) * scaleX;

  const y =
    (
      rect.top -
      stageRect.top
    ) * scaleY;

  const width =
    rect.width *
    scaleX;

  const height =
    rect.height *
    scaleY;

  context.drawImage(
    element,
    x,
    y,
    width,
    height
  );

}


/* ============================================================
   AR Canvas를 최종 사진에 합성
   ============================================================ */

function drawArCanvas(
  context,
  arCanvasElement,
  outputWidth,
  outputHeight
) {

  if (
    !isVisibleElement(
      arCanvasElement
    ) ||
    !arCanvasElement.width ||
    !arCanvasElement.height
  ) {
    return;
  }

  context.drawImage(
    arCanvasElement,
    0,
    0,
    outputWidth,
    outputHeight
  );

}


/* ============================================================
   실제 사진 촬영 및 PNG 생성
   ============================================================

   현재 화면의 레이어를 그대로 합성합니다.

   카메라
   → 정적/움직이는 배경
   → 정적/움직이는 캐릭터
   → 캐릭터 전용 title.png
   → AR Canvas
   → PNG
   ============================================================ */

export async function capturePhoto(
  videoElement,
  canvasElement,
  layers = {}
) {

  const outputWidth =
    CONFIG.outputWidth;

  const outputHeight =
    CONFIG.outputHeight;

  canvasElement.width =
    outputWidth;

  canvasElement.height =
    outputHeight;

  const context =
    canvasElement.getContext(
      "2d",
      {
        alpha: false
      }
    );

  context.clearRect(
    0,
    0,
    outputWidth,
    outputHeight
  );

  const videoWidth =
    videoElement.videoWidth;

  const videoHeight =
    videoElement.videoHeight;

  if (
    !videoWidth ||
    !videoHeight
  ) {

    throw new Error(
      "카메라 영상이 아직 준비되지 않았습니다."
    );

  }

  const targetAspectRatio =
    outputWidth /
    outputHeight;

  const crop =
    calculateCrop(
      videoWidth,
      videoHeight,
      targetAspectRatio
    );


  /* ----------------------------------------------------------
     카메라 영상
     ---------------------------------------------------------- */

  context.save();

  if (
    CONFIG.facingMode === "user" &&
    CONFIG.mirrorFrontCamera
  ) {

    context.translate(
      outputWidth,
      0
    );

    context.scale(
      -1,
      1
    );

  }

  context.drawImage(
    videoElement,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    0,
    0,
    outputWidth,
    outputHeight
  );

  context.restore();


  const stageElement =
    layers.cameraStageElement;

  if (!stageElement) {

    throw new Error(
      "촬영 화면 정보를 찾을 수 없습니다."
    );

  }


  /* ----------------------------------------------------------
     화면에 보이는 이미지 레이어

     네 모드는 상호 배타적이라 한 효과만 활성화되지만,
     캐릭터 계열에서는 title.png이 함께 표시됩니다.
     ---------------------------------------------------------- */

  drawImageOverlay(
    context,
    layers.backgroundOverlayElement,
    stageElement,
    outputWidth,
    outputHeight
  );

  drawImageOverlay(
    context,
    layers.animatedBackgroundOverlayElement,
    stageElement,
    outputWidth,
    outputHeight
  );

  drawImageOverlay(
    context,
    layers.characterOverlayElement,
    stageElement,
    outputWidth,
    outputHeight
  );

  drawImageOverlay(
    context,
    layers.animatedCharacterOverlayElement,
    stageElement,
    outputWidth,
    outputHeight
  );

  drawImageOverlay(
    context,
    layers.characterTitleOverlayElement,
    stageElement,
    outputWidth,
    outputHeight
  );

  drawArCanvas(
    context,
    layers.arOverlayCanvasElement,
    outputWidth,
    outputHeight
  );


  const blob =
    await new Promise(
      resolve => {

        canvasElement.toBlob(
          resolve,
          "image/png"
        );

      }
    );

  if (!blob) {

    throw new Error(
      "PNG 이미지 생성에 실패했습니다."
    );

  }

  return blob;

}


/* ============================================================
   저장 파일명
   ============================================================ */

function createFilename() {

  const now =
    new Date();

  const pad =
    value =>
      String(value).padStart(
        2,
        "0"
      );

  const year =
    now.getFullYear();

  const month =
    pad(
      now.getMonth() + 1
    );

  const day =
    pad(
      now.getDate()
    );

  const hour =
    pad(
      now.getHours()
    );

  const minute =
    pad(
      now.getMinutes()
    );

  const second =
    pad(
      now.getSeconds()
    );

  return (
    `photo_${year}${month}${day}_` +
    `${hour}${minute}${second}.png`
  );

}


/* ============================================================
   PNG 다운로드
   ============================================================ */

export function downloadPhoto(blob) {

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    createFilename();

  document.body.appendChild(
    anchor
  );

  anchor.click();

  anchor.remove();

  window.setTimeout(
    () => {

      URL.revokeObjectURL(
        url
      );

    },
    1000
  );

}
