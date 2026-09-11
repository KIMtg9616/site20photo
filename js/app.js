/* ============================================================
   app.js
   ------------------------------------------------------------
   전체 웹사이트 기능 연결

   현재 기능
   1. 카메라 실행
   2. 정적 배경 선택
   3. 사진 촬영
   4. PNG 저장
   5. 다시 찍기
   6. 전면 ↔ 후면 카메라 전환
   7. 선택 모드 순환
      배경 → 캐릭터 → 움직임 → AR → 배경
   ============================================================ */


import {
  CONFIG
} from "./config.js";


import {
  startCamera,
  switchCamera,
  getCurrentFacingMode
} from "./camera.js";


import {
  BackgroundManager
} from "./backgrounds.js";


import {
  capturePhoto,
  downloadPhoto
} from "./capture.js";


/* ============================================================
   HTML 요소
   ============================================================ */

const videoElement =
  document.getElementById(
    "cameraVideo"
  );


const cameraMessage =
  document.getElementById(
    "cameraMessage"
  );


const backgroundOverlay =
  document.getElementById(
    "backgroundOverlay"
  );


const backgroundList =
  document.getElementById(
    "backgroundList"
  );


const selectorTitle =
  document.getElementById(
    "selectorTitle"
  );


const captureButton =
  document.getElementById(
    "captureButton"
  );


const switchCameraButton =
  document.getElementById(
    "switchCameraButton"
  );


/*
  새로 추가된 왼쪽 기능 모드 버튼
*/
const modeSwitchButton =
  document.getElementById(
    "modeSwitchButton"
  );


const modeSwitchIcon =
  document.getElementById(
    "modeSwitchIcon"
  );


const modeSwitchLabel =
  document.getElementById(
    "modeSwitchLabel"
  );


const captureCanvas =
  document.getElementById(
    "captureCanvas"
  );


const cameraFlash =
  document.getElementById(
    "cameraFlash"
  );


const resultSection =
  document.getElementById(
    "resultSection"
  );


const resultImage =
  document.getElementById(
    "resultImage"
  );


const retryButton =
  document.getElementById(
    "retryButton"
  );


const downloadButton =
  document.getElementById(
    "downloadButton"
  );


/* ============================================================
   선택 관리자
   ============================================================ */

const backgroundManager =
  new BackgroundManager(
    backgroundList,
    backgroundOverlay,
    selectorTitle
  );


/* ============================================================
   현재 촬영 결과
   ============================================================ */

let currentPhotoBlob =
  null;


let currentPhotoUrl =
  null;


/* ============================================================
   선택 모드 상태
   ============================================================ */

let currentModeIndex =
  0;


/*
  기능 모드별 아이콘

  외부 이미지 파일을 추가하지 않고
  SVG를 코드 내부에서 사용합니다.
*/
const MODE_ICONS = {

  /*
    배경: 사진/풍경
  */
  background: `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      ></rect>

      <circle
        cx="8.2"
        cy="9"
        r="1.6"
      ></circle>

      <path
        d="M4.5 17l4.6-4.6 3.1 3.1 2.4-2.4 4.9 4.9"
      ></path>
    </svg>
  `,


  /*
    캐릭터: 얼굴/사람
  */
  character: `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="3.2"
      ></circle>

      <path
        d="M5.5 19c.8-3.8 3-5.8 6.5-5.8s5.7 2 6.5 5.8"
      ></path>

      <path
        d="M18.2 4.8l.6 1.2 1.3.2-.9.9.2 1.3-1.2-.6-1.2.6.2-1.3-.9-.9 1.3-.2z"
      ></path>
    </svg>
  `,


  /*
    움직임: 재생 + 움직임 선
  */
  motion: `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect
        x="5"
        y="4"
        width="14"
        height="16"
        rx="3"
      ></rect>

      <path
        d="M10 9l5 3-5 3z"
      ></path>

      <path
        d="M2.5 8h1.5"
      ></path>

      <path
        d="M2 12h2"
      ></path>

      <path
        d="M2.5 16h1.5"
      ></path>
    </svg>
  `,


  /*
    AR: 얼굴 스캔
  */
  ar: `
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M8 3H5a2 2 0 0 0-2 2v3"
      ></path>

      <path
        d="M16 3h3a2 2 0 0 1 2 2v3"
      ></path>

      <path
        d="M21 16v3a2 2 0 0 1-2 2h-3"
      ></path>

      <path
        d="M8 21H5a2 2 0 0 1-2-2v-3"
      ></path>

      <circle
        cx="9"
        cy="10"
        r=".7"
      ></circle>

      <circle
        cx="15"
        cy="10"
        r=".7"
      ></circle>

      <path
        d="M8.5 14.5c1 1.1 2.1 1.6 3.5 1.6s2.5-.5 3.5-1.6"
      ></path>
    </svg>
  `

};


/* ============================================================
   선택 모드 UI 적용
   ============================================================ */

function updateModeUI() {

  const modes =
    CONFIG.selectionModes;


  if (
    !Array.isArray(modes) ||
    modes.length === 0
  ) {

    return;

  }


  const mode =
    modes[currentModeIndex];


  /*
    왼쪽 버튼 아래 텍스트 변경
  */
  modeSwitchLabel.textContent =
    mode.buttonLabel;


  /*
    모드에 맞는 아이콘 변경
  */
  modeSwitchIcon.innerHTML =
    MODE_ICONS[mode.id] ||
    MODE_ICONS.background;


  /*
    접근성 설명도 현재 모드 이름으로 변경
  */
  modeSwitchButton.setAttribute(
    "aria-label",
    `선택 기능 변경, 현재 ${mode.buttonLabel}`
  );


  modeSwitchButton.setAttribute(
    "title",
    `현재 ${mode.buttonLabel} 선택`
  );


  /*
    카메라와 촬영 버튼 사이의 선택창을
    현재 모드에 맞게 다시 그립니다.
  */
  backgroundManager.setMode(
    mode.id
  );

}


/* ============================================================
   왼쪽 기능 모드 버튼

   배경
   → 캐릭터
   → 움직임
   → AR
   → 배경

   순서로 반복합니다.
   ============================================================ */

modeSwitchButton.addEventListener(
  "click",
  () => {

    const modeCount =
      CONFIG.selectionModes.length;


    if (modeCount === 0) {

      return;

    }


    currentModeIndex =
      (
        currentModeIndex + 1
      ) %
      modeCount;


    updateModeUI();

  }
);


/* ============================================================
   웹페이지 초기화
   ============================================================ */

async function initialize() {

  /*
    첫 화면:
    배경 선택 모드
  */
  updateModeUI();


  /*
    브라우저 카메라 API 지원 확인
  */
  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    cameraMessage.textContent =
      "이 브라우저에서는 카메라 기능을 사용할 수 없습니다.";


    return;

  }


  cameraMessage.textContent =
    "카메라 권한을 허용해 주세요.";


  /*
    기본 카메라 실행
  */
  const cameraResult =
    await startCamera(
      videoElement
    );


  if (!cameraResult.success) {

    handleCameraError(
      cameraResult.error
    );


    return;

  }


  /*
    실제 영상 데이터 준비 대기
  */
  await waitForVideoReady();


  /*
    전면/후면에 따른 미리보기 방향 적용
  */
  updateCameraPreviewDirection();


  cameraMessage.classList.add(
    "hidden"
  );


  /*
    카메라 준비 완료 후 촬영/전환 활성화
  */
  captureButton.disabled =
    false;


  if (switchCameraButton) {

    switchCameraButton.disabled =
      false;

  }

}


/* ============================================================
   카메라 영상 준비 대기
   ============================================================ */

function waitForVideoReady() {

  return new Promise(
    resolve => {

      if (
        videoElement.readyState >= 2 &&
        videoElement.videoWidth > 0 &&
        videoElement.videoHeight > 0
      ) {

        resolve();

        return;

      }


      videoElement.addEventListener(
        "loadeddata",
        () => {

          resolve();

        },
        {
          once: true
        }
      );

    }
  );

}


/* ============================================================
   전면/후면 미리보기 방향
   ============================================================ */

function updateCameraPreviewDirection() {

  const facingMode =
    getCurrentFacingMode();


  videoElement.classList.toggle(
    "rear-camera",
    facingMode === "environment"
  );

}


/* ============================================================
   카메라 오류 처리
   ============================================================ */

function handleCameraError(error) {

  console.error(
    "카메라 오류:",
    error
  );


  let message =
    "카메라를 실행할 수 없습니다.";


  if (
    error.name === "NotAllowedError" ||
    error.name === "PermissionDeniedError"
  ) {

    message =
      "카메라 권한이 허용되지 않았습니다.\n" +
      "브라우저 설정에서 카메라 권한을 허용해 주세요.";

  }

  else if (
    error.name === "NotFoundError" ||
    error.name === "DevicesNotFoundError"
  ) {

    message =
      "사용 가능한 카메라를 찾을 수 없습니다.";

  }

  else if (
    error.name === "NotReadableError"
  ) {

    message =
      "카메라를 사용할 수 없습니다.\n" +
      "다른 앱에서 카메라를 사용 중인지 확인해 주세요.";

  }

  else if (
    error.name === "OverconstrainedError"
  ) {

    message =
      "현재 기기에서 요청한 카메라 설정을 사용할 수 없습니다.";

  }


  cameraMessage.innerText =
    message;


  cameraMessage.classList.remove(
    "hidden"
  );

}


/* ============================================================
   촬영 플래시
   ============================================================ */

function playFlash() {

  cameraFlash.classList.remove(
    "active"
  );


  void cameraFlash.offsetWidth;


  cameraFlash.classList.add(
    "active"
  );

}


/* ============================================================
   카메라 전환
   ============================================================ */

if (switchCameraButton) {

  switchCameraButton.addEventListener(
    "click",
    async () => {

      captureButton.disabled =
        true;


      switchCameraButton.disabled =
        true;


      cameraMessage.textContent =
        "카메라를 전환하고 있습니다.";


      cameraMessage.classList.remove(
        "hidden"
      );


      try {

        const result =
          await switchCamera(
            videoElement
          );


        if (!result.success) {

          throw (
            result.error ||
            new Error(
              "카메라를 전환할 수 없습니다."
            )
          );

        }


        await waitForVideoReady();


        updateCameraPreviewDirection();


        cameraMessage.classList.add(
          "hidden"
        );

      }

      catch (error) {

        console.error(
          "카메라 전환 오류:",
          error
        );


        cameraMessage.textContent =
          "다른 카메라로 전환할 수 없습니다.";


        window.setTimeout(
          () => {

            cameraMessage.classList.add(
              "hidden"
            );

          },
          1500
        );

      }

      finally {

        captureButton.disabled =
          false;


        switchCameraButton.disabled =
          false;

      }

    }
  );

}


/* ============================================================
   촬영
   ============================================================ */

captureButton.addEventListener(
  "click",
  async () => {

    captureButton.disabled =
      true;


    if (switchCameraButton) {

      switchCameraButton.disabled =
        true;

    }


    /*
      촬영 처리 중 선택 모드 버튼도 잠시 잠급니다.
    */
    modeSwitchButton.disabled =
      true;


    try {

      playFlash();


      /*
        현재 1차 촬영에서는 선택된 정적 배경만
        capture.js로 전달합니다.
      */
      const selectedBackground =
        backgroundManager
          .getSelectedBackground();


      const photoBlob =
        await capturePhoto(
          videoElement,
          captureCanvas,
          selectedBackground
        );


      if (currentPhotoUrl) {

        URL.revokeObjectURL(
          currentPhotoUrl
        );

      }


      currentPhotoBlob =
        photoBlob;


      currentPhotoUrl =
        URL.createObjectURL(
          photoBlob
        );


      resultImage.src =
        currentPhotoUrl;


      resultSection.classList.remove(
        "hidden"
      );


      resultSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    }

    catch (error) {

      console.error(
        "촬영 오류:",
        error
      );


      alert(
        "사진 촬영 중 오류가 발생했습니다.\n" +
        (
          error.message ||
          "다시 시도해 주세요."
        )
      );

    }

    finally {

      captureButton.disabled =
        false;


      if (switchCameraButton) {

        switchCameraButton.disabled =
          false;

      }


      modeSwitchButton.disabled =
        false;

    }

  }
);


/* ============================================================
   다시 찍기
   ============================================================ */

retryButton.addEventListener(
  "click",
  () => {

    resultSection.classList.add(
      "hidden"
    );


    if (currentPhotoUrl) {

      URL.revokeObjectURL(
        currentPhotoUrl
      );


      currentPhotoUrl =
        null;

    }


    currentPhotoBlob =
      null;


    resultImage.removeAttribute(
      "src"
    );


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


/* ============================================================
   PNG 저장
   ============================================================ */

downloadButton.addEventListener(
  "click",
  () => {

    if (!currentPhotoBlob) {

      alert(
        "저장할 사진이 없습니다."
      );


      return;

    }


    downloadPhoto(
      currentPhotoBlob
    );

  }
);


/* ============================================================
   페이지 실행
   ============================================================ */

initialize();
