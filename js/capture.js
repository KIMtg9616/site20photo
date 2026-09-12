import { CONFIG } from "./config.js";


/* ============================================================
   원본 카메라 영상을 4:3으로 중앙 크롭하기 위한 계산
   ============================================================ */

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
   DOM 레이어가 실제로 보이는지 확인
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
   화면에 표시 중인 img 레이어를 Canvas에 그대로 그리기

   정적 PNG와 Animated WebP의 현재 프레임 모두 처리합니다.
   ============================================================ */

function drawImageOverlay(
  context,
  element,
  stageElement,
  outputWidth,
  outputHeight,
  sourceOverride = null
) {

  if (!isVisibleElement(element)) {
    return;
  }

  /*
    일반 촬영은 DOM img를 그대로 사용합니다.
    GIF 녹화에서는 Animated WebP를 ImageDecoder로 해석한
    현재 프레임(ImageBitmap)을 sourceOverride로 전달할 수 있습니다.
  */
  const source =
    sourceOverride ||
    element;

  if (!sourceOverride) {

    if (
      !element.complete ||
      !element.naturalWidth ||
      !element.naturalHeight
    ) {
      return;
    }

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
    source,
    x,
    y,
    width,
    height
  );

}


/* ============================================================
   AR Canvas를 결과 Canvas에 합성
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
   현재 카메라 화면 + 활성 레이어를 Canvas에 합성

   PNG 촬영과 GIF 프레임 캡처가 같은 합성 코드를 사용합니다.
   ============================================================ */

export function renderCompositeFrame(
  videoElement,
  canvasElement,
  layers = {},
  outputWidth = CONFIG.outputWidth,
  outputHeight = CONFIG.outputHeight,
  animatedFrameOverrides = {}
) {

  if (
    canvasElement.width !==
    outputWidth
  ) {

    canvasElement.width =
      outputWidth;

  }

  if (
    canvasElement.height !==
    outputHeight
  ) {

    canvasElement.height =
      outputHeight;

  }

  const context =
    canvasElement.getContext(
      "2d",
      {
        alpha: false,
        willReadFrequently: true
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
     현재 활성화된 화면 레이어
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
    outputHeight,
    animatedFrameOverrides.background ||
      null
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
    outputHeight,
    animatedFrameOverrides.character ||
      null
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

  return context;

}


/* ============================================================
   PNG 촬영
   ============================================================ */

export async function capturePhoto(
  videoElement,
  canvasElement,
  layers = {}
) {

  renderCompositeFrame(
    videoElement,
    canvasElement,
    layers,
    CONFIG.outputWidth,
    CONFIG.outputHeight
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

export function createMediaFilename(
  extension = "png"
) {

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
    `${hour}${minute}${second}.${extension}`
  );

}


/* ============================================================
   PNG / GIF 다운로드 공통 함수
   ============================================================ */

export function downloadMedia(
  blob,
  mediaType = "png"
) {

  const extension =
    mediaType === "gif"
      ? "gif"
      : "png";

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement(
      "a"
    );

  anchor.href =
    url;

  anchor.download =
    createMediaFilename(
      extension
    );

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


/* 기존 코드 호환용 */
export function downloadPhoto(blob) {

  downloadMedia(
    blob,
    "png"
  );

}


/* ============================================================
   공유

   모바일 브라우저의 Web Share API를 사용합니다.
   지원되는 경우 이미지 파일 자체를 시스템 공유창으로 전달합니다.
   카카오톡 / 문자 / SNS 등 실제 표시 항목은 기기와 설치 앱에 따라 달라집니다.
   ============================================================ */

export async function shareMedia(
  blob,
  mediaType = "png"
) {

  if (!blob) {

    throw new Error(
      "SHARE_NO_FILE"
    );

  }

  const isGif =
    mediaType === "gif";

  const extension =
    isGif
      ? "gif"
      : "png";

  const mimeType =
    isGif
      ? "image/gif"
      : "image/png";

  const file =
    new File(
      [blob],
      createMediaFilename(
        extension
      ),
      {
        type: mimeType
      }
    );


  /* ----------------------------------------------------------
     1순위: 실제 이미지 파일 공유
     ---------------------------------------------------------- */

  if (
    navigator.share &&
    navigator.canShare
  ) {

    let canShareFile =
      false;

    try {

      canShareFile =
        navigator.canShare({
          files: [file]
        });

    }
    catch (error) {

      canShareFile =
        false;

    }

    if (canShareFile) {

      await navigator.share({
        title: "희망의 과학싹잔치 촬영 결과",
        text: "희망의 과학싹잔치에서 촬영한 이미지입니다.",
        files: [file]
      });

      return {
        type: "file"
      };

    }

  }


  /* ----------------------------------------------------------
     2순위: 파일 공유가 안 되면 현재 페이지 링크 공유
     ---------------------------------------------------------- */

  if (navigator.share) {

    await navigator.share({
      title: "희망의 과학싹잔치",
      text:
        "이 브라우저에서는 이미지 파일 직접 공유를 지원하지 않아 사이트 링크를 공유합니다.",
      url: window.location.href
    });

    return {
      type: "link"
    };

  }


  throw new Error(
    "SHARE_UNSUPPORTED"
  );

}
