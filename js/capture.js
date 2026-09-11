import { CONFIG } from "./config.js";


/*
 ============================================================
 이미지 캐시
 ============================================================

 같은 배경을 반복 촬영할 때 매번 다시 로딩하지 않도록
 브라우저 메모리에 저장합니다.
*/

const imageCache = new Map();


/*
 이미지 로딩
*/
async function loadImage(src) {

  if (!src) {
    return null;
  }


  if (imageCache.has(src)) {

    return imageCache.get(src);

  }


  const image =
    new Image();


  image.src =
    src;


  /*
   decode() 지원 브라우저에서는
   이미지 디코딩이 끝날 때까지 기다립니다.
  */
  if (image.decode) {

    await image.decode();

  }

  else {

    await new Promise(
      (resolve, reject) => {

        image.onload = resolve;
        image.onerror = reject;

      }
    );

  }


  imageCache.set(src, image);


  return image;

}


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


  /*
   원본이 목표보다 가로로 넓은 경우
   좌우를 잘라냅니다.
  */
  if (sourceAspectRatio > targetAspectRatio) {

    sw =
      sourceHeight * targetAspectRatio;

    sx =
      (sourceWidth - sw) / 2;

  }


  /*
   원본이 목표보다 세로로 긴 경우
   위아래를 잘라냅니다.
  */
  else if (sourceAspectRatio < targetAspectRatio) {

    sh =
      sourceWidth / targetAspectRatio;

    sy =
      (sourceHeight - sh) / 2;

  }


  return {
    sx,
    sy,
    sw,
    sh
  };

}


/*
 ============================================================
 실제 사진 촬영 및 PNG 생성
 ============================================================
*/

export async function capturePhoto(
  videoElement,
  canvasElement,
  selectedBackground
) {

  const outputWidth =
    CONFIG.outputWidth;

  const outputHeight =
    CONFIG.outputHeight;


  /*
   Canvas 실제 저장 해상도
  */
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


  /*
   실제 카메라 스트림 해상도
  */
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
    outputWidth / outputHeight;


  const crop =
    calculateCrop(
      videoWidth,
      videoHeight,
      targetAspectRatio
    );


  /*
   ----------------------------------------------------------
   카메라 영상 그리기
   ----------------------------------------------------------
  */

  context.save();


  /*
   전면 카메라를 미리보기와 같은 거울 방향으로 저장합니다.
  */
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

    /* 원본 카메라에서 가져올 영역 */
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,

    /* 최종 Canvas 출력 영역 */
    0,
    0,
    outputWidth,
    outputHeight

  );


  context.restore();


  /*
   ----------------------------------------------------------
   선택한 정적 배경/프레임을 카메라 위에 합성
   ----------------------------------------------------------

   현재 1차 버전에서는 사람 배경 제거 기능이 없습니다.
   따라서 중앙이 투명한 프레임 이미지를 사용하는 것이 좋습니다.
  */

  if (
    selectedBackground &&
    selectedBackground.src
  ) {

    const backgroundImage =
      await loadImage(
        selectedBackground.src
      );


    context.drawImage(
      backgroundImage,
      0,
      0,
      outputWidth,
      outputHeight
    );

  }


  /*
   Canvas → PNG Blob
  */
  const blob =
    await new Promise(resolve => {

      canvasElement.toBlob(
        resolve,
        "image/png"
      );

    });


  if (!blob) {

    throw new Error(
      "PNG 이미지 생성에 실패했습니다."
    );

  }


  return blob;

}


/*
 ============================================================
 저장 파일명 생성
 ============================================================
*/

function createFilename() {

  const now =
    new Date();


  const pad =
    value =>
      String(value).padStart(2, "0");


  const year =
    now.getFullYear();

  const month =
    pad(now.getMonth() + 1);

  const day =
    pad(now.getDate());

  const hour =
    pad(now.getHours());

  const minute =
    pad(now.getMinutes());

  const second =
    pad(now.getSeconds());


  return (
    `photo_${year}${month}${day}_` +
    `${hour}${minute}${second}.png`
  );

}


/*
 ============================================================
 PNG 다운로드
 ============================================================
*/

export function downloadPhoto(blob) {

  const url =
    URL.createObjectURL(blob);


  const anchor =
    document.createElement("a");


  anchor.href =
    url;

  anchor.download =
    createFilename();


  document.body.appendChild(anchor);


  anchor.click();


  anchor.remove();


  /*
   생성한 임시 URL을 메모리에서 해제합니다.
  */
  window.setTimeout(
    () => {

      URL.revokeObjectURL(url);

    },
    1000
  );

}
