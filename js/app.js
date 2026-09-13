/* ============================================================
   app.js
   ------------------------------------------------------------
   전체 웹사이트 기능 연결

   현재 기능
   1. 카메라 실행
   2. 배경 / 캐릭터 / 움직임 / AR 독립 선택
   3. PNG 사진 촬영
   4. 전면 ↔ 후면 카메라 전환
   5. GIF 버튼을 누르고 있는 시간만큼 GIF 촬영 (최대 3초)
   6. PNG / GIF 저장
   7. 시스템 공유창을 통한 이미지 공유
   8. AR 얼굴 인식 인원 안내 (최대 3명)
   9. AR 첫 사용 얼굴 맞춤 안내 토스트
   10. 저장 / 공유 완료 피드백
   11. 세로 ↔ 가로 화면 회전 대응
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
  ARTracker
} from "./ar.js";


import {
  capturePhoto,
  downloadMedia,
  shareMedia
} from "./capture.js";


import {
  GifRecorder
} from "./gif.js";


/* ============================================================
   HTML 요소
   ============================================================ */

const cameraStage =
  document.getElementById(
    "cameraStage"
  );


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


const characterOverlay =
  document.getElementById(
    "characterOverlay"
  );


const animatedBackgroundOverlay =
  document.getElementById(
    "animatedBackgroundOverlay"
  );


const animatedCharacterOverlay =
  document.getElementById(
    "animatedCharacterOverlay"
  );


const characterTitleOverlay =
  document.getElementById(
    "characterTitleOverlay"
  );


const arOverlayCanvas =
  document.getElementById(
    "arOverlayCanvas"
  );


const arFaceCount =
  document.getElementById(
    "arFaceCount"
  );


const gifTimer =
  document.getElementById(
    "gifTimer"
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


const gifButton =
  document.getElementById(
    "gifButton"
  );


const noticeButton =
  document.getElementById(
    "noticeButton"
  );


const noticeModal =
  document.getElementById(
    "noticeModal"
  );


const noticeModalBackdrop =
  document.getElementById(
    "noticeModalBackdrop"
  );


const noticeImage =
  document.getElementById(
    "noticeImage"
  );


const noticeEmpty =
  document.getElementById(
    "noticeEmpty"
  );


const noticeCounter =
  document.getElementById(
    "noticeCounter"
  );


const noticePrevButton =
  document.getElementById(
    "noticePrevButton"
  );


const noticeNextButton =
  document.getElementById(
    "noticeNextButton"
  );


const noticeCloseButton =
  document.getElementById(
    "noticeCloseButton"
  );


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


const shareButton =
  document.getElementById(
    "shareButton"
  );


/* ============================================================
   화면 레이어 정보
   ============================================================ */

const captureLayers = {

  cameraStageElement:
    cameraStage,

  backgroundOverlayElement:
    backgroundOverlay,

  characterOverlayElement:
    characterOverlay,

  animatedBackgroundOverlayElement:
    animatedBackgroundOverlay,

  animatedCharacterOverlayElement:
    animatedCharacterOverlay,

  characterTitleOverlayElement:
    characterTitleOverlay,

  arOverlayCanvasElement:
    arOverlayCanvas

};


/* ============================================================
   AR / 선택 관리자
   ============================================================ */

let arGuideFirstSessionStarted =
  false;


let arGuideTimerId =
  null;


function cancelArGuideTimer() {

  if (!arGuideTimerId) {
    return;
  }


  clearTimeout(
    arGuideTimerId
  );


  arGuideTimerId =
    null;

}


const arTracker =
  new ARTracker(
    videoElement,
    cameraStage,
    arOverlayCanvas,
    ({
      count,
      maxFaces,
      active
    }) => {

      if (!active) {

        cancelArGuideTimer();


        if (arFaceCount) {

          arFaceCount.classList.remove(
            "show",
            "limit"
          );

          arFaceCount.textContent =
            `얼굴 0/${maxFaces}명`;

        }


        return;

      }


      /*
        얼굴 맞춤 안내는 사이트를 연 뒤
        처음 AR을 사용하는 순간에만 검사합니다.

        처음 AR 선택 직후 약 0.7초 동안 얼굴이 계속 0명이면
        "얼굴을 카메라에 맞춰 주세요" 토스트를 한 번 표시합니다.
        이후에는 AR을 다시 선택해도 반복하지 않습니다.
      */
      if (!arGuideFirstSessionStarted) {

        arGuideFirstSessionStarted =
          true;


        if (count === 0) {

          arGuideTimerId =
            window.setTimeout(
              () => {

                arGuideTimerId =
                  null;


                if (
                  arTracker.lastFaceCount === 0 &&
                  arTracker.faceCountActive
                ) {

                  backgroundManager.showToast(
                    "얼굴을 카메라에 맞춰 주세요"
                  );

                }

              },
              700
            );

        }

      }


      if (
        count > 0 &&
        arGuideTimerId
      ) {

        cancelArGuideTimer();

      }


      if (!arFaceCount) {
        return;
      }


      arFaceCount.textContent =
        `얼굴 ${count}/${maxFaces}명`;

      arFaceCount.classList.add(
        "show"
      );

      arFaceCount.classList.toggle(
        "limit",
        count >= maxFaces
      );

    }
  );


const backgroundManager =
  new BackgroundManager(
    backgroundList,
    backgroundOverlay,
    selectorTitle,
    characterOverlay,
    animatedBackgroundOverlay,
    animatedCharacterOverlay,
    characterTitleOverlay,
    arTracker
  );


/* ============================================================
   GIF 녹화기
   ============================================================ */

const gifRecorder =
  new GifRecorder(
    videoElement,
    captureLayers
  );


let gifRecording =
  false;


let gifEncoding =
  false;


let gifStartedAt =
  0;


let gifTimerAnimationId =
  null;


let gifAutoStopTimerId =
  null;


let gifPointerId =
  null;


/* ============================================================
   현재 결과
   ============================================================ */

let currentResultBlob =
  null;


let currentResultUrl =
  null;


let currentResultType =
  "png";


/* ============================================================
   선택 모드 상태
   ============================================================ */

let currentModeIndex =
  0;


/* ============================================================
   기능 모드별 아이콘
   ============================================================ */

const MODE_ICONS = {

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


  modeSwitchLabel.textContent =
    mode.buttonLabel;


  modeSwitchIcon.innerHTML =
    MODE_ICONS[mode.id] ||
    MODE_ICONS.background;


  modeSwitchButton.setAttribute(
    "aria-label",
    `선택 기능 변경, 현재 ${mode.buttonLabel}`
  );


  modeSwitchButton.setAttribute(
    "title",
    `현재 ${mode.buttonLabel} 선택`
  );


  backgroundManager.setMode(
    mode.id
  );

}


/* ============================================================
   모드 순환
   ============================================================ */

modeSwitchButton.addEventListener(
  "click",
  () => {

    if (
      gifRecording ||
      gifEncoding
    ) {
      return;
    }


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


  /*
    전면/후면 카메라가 바뀌면 좌표 기준도 달라지므로
    기존 AR 보간 상태를 초기화하고 다음 프레임부터 다시 맞춥니다.
  */
  arTracker.refreshLayout(
    true
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
   결과 표시
   ============================================================ */

function showResult(
  blob,
  mediaType
) {

  if (currentResultUrl) {

    URL.revokeObjectURL(
      currentResultUrl
    );

  }


  currentResultBlob =
    blob;


  currentResultType =
    mediaType;


  currentResultUrl =
    URL.createObjectURL(
      blob
    );


  resultImage.src =
    currentResultUrl;


  resultImage.alt =
    mediaType === "gif"
      ? "촬영된 GIF"
      : "촬영된 PNG 사진";


  downloadButton.textContent =
    mediaType === "gif"
      ? "GIF 저장"
      : "PNG 저장";


  resultSection.classList.remove(
    "hidden"
  );


  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

}


/* ============================================================
   결과 초기화
   ============================================================ */

function clearResult() {

  resultSection.classList.add(
    "hidden"
  );


  if (currentResultUrl) {

    URL.revokeObjectURL(
      currentResultUrl
    );


    currentResultUrl =
      null;

  }


  currentResultBlob =
    null;


  currentResultType =
    "png";


  resultImage.removeAttribute(
    "src"
  );


  downloadButton.textContent =
    "PNG 저장";

}


/* ============================================================
   일반 조작 버튼 잠금
   ============================================================ */

 function setStandardControlsDisabled(
  disabled
) {

  captureButton.disabled =
    disabled;


  modeSwitchButton.disabled =
    disabled;


  if (noticeButton) {

    noticeButton.disabled =
      disabled ||
      getNotices().length === 0;

  }


  if (switchCameraButton) {

    switchCameraButton.disabled =
      disabled;

  }

}


/* ============================================================
   초기화
   ============================================================ */

/*
  사이트 첫 진입에서 공지를 먼저 보여주기 위해
  카메라 초기화 여부를 별도로 관리합니다.

  공지가 자동으로 열리는 경우:
  1. 공지 모달 먼저 표시
  2. 사용자가 닫기
  3. 카메라 권한 요청 및 카메라 실행

  이렇게 하면 모바일에서 브라우저의 카메라 권한 팝업이
  공지 모달보다 먼저 나타나는 현상을 피할 수 있습니다.
*/
let cameraInitializationStarted =
  false;


async function initializeCamera() {

  if (cameraInitializationStarted) {
    return;
  }


  cameraInitializationStarted =
    true;


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


  await waitForVideoReady();


  updateCameraPreviewDirection();


  cameraMessage.classList.add(
    "hidden"
  );


  captureButton.disabled =
    false;


  if (switchCameraButton) {

    switchCameraButton.disabled =
      false;

  }


  if (gifButton) {

    gifButton.disabled =
      false;

  }

}


async function initialize() {

  updateModeUI();


  /*
    사이트 진입 직후 자동 공지 표시

    CONFIG.noticeAutoOpen이 false가 아니고
    현재 공개 상태인 공지가 하나 이상 있을 때 실행합니다.
  */
  const shouldAutoOpenNotice =
    CONFIG.noticeAutoOpen !== false &&
    getNotices().length > 0;


  if (shouldAutoOpenNotice) {

    /*
      config.js의 noticeOrder 기준으로 정렬된
      첫 번째 공개 공지부터 시작합니다.
    */
    currentNoticeIndex =
      0;


    openNoticeModal();


    /*
      카메라는 공지를 닫은 뒤 closeNoticeModal()에서
      자동으로 초기화됩니다.
    */
    return;

  }


  await initializeCamera();

}


/* ============================================================
   카메라 전환
   ============================================================ */

if (switchCameraButton) {

  switchCameraButton.addEventListener(
    "click",
    async () => {

      if (
        gifRecording ||
        gifEncoding
      ) {
        return;
      }


      setStandardControlsDisabled(
        true
      );


      if (gifButton) {
        gifButton.disabled = true;
      }


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

        setStandardControlsDisabled(
          false
        );


        if (gifButton) {
          gifButton.disabled = false;
        }

      }

    }
  );

}


/* ============================================================
   PNG 촬영
   ============================================================ */

captureButton.addEventListener(
  "click",
  async () => {

    if (
      gifRecording ||
      gifEncoding
    ) {
      return;
    }


    setStandardControlsDisabled(
      true
    );


    if (gifButton) {
      gifButton.disabled = true;
    }


    try {

      /*
        촬영 플래시는 사용하지 않습니다.
        사용자가 선택한 현재 화면을 그대로 PNG로 촬영합니다.
      */
      const photoBlob =
        await capturePhoto(
          videoElement,
          captureCanvas,
          captureLayers
        );


      showResult(
        photoBlob,
        "png"
      );

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

      setStandardControlsDisabled(
        false
      );


      if (gifButton) {
        gifButton.disabled = false;
      }

    }

  }
);


/* ============================================================
   GIF 시간 표시
   ============================================================ */

function updateGifTimerLoop() {

  if (!gifRecording) {
    return;
  }


  const maxDuration =
    CONFIG.gif?.maxDurationMs ||
    3000;


  const elapsed =
    Math.min(
      performance.now() -
      gifStartedAt,
      maxDuration
    );


  gifTimer.textContent =
    `${(elapsed / 1000).toFixed(1)}초`;


  gifTimerAnimationId =
    requestAnimationFrame(
      updateGifTimerLoop
    );

}


/* ============================================================
   GIF 녹화 시작
   ============================================================ */

function startGifRecording(event) {

  if (
    gifButton.disabled ||
    gifRecording ||
    gifEncoding
  ) {
    return;
  }


  if (event) {
    event.preventDefault();
  }


  clearResult();


  gifRecording =
    true;


  gifStartedAt =
    performance.now();


  gifPointerId =
    event?.pointerId ??
    null;


  if (
    event?.pointerId !== undefined &&
    gifButton.setPointerCapture
  ) {

    try {

      gifButton.setPointerCapture(
        event.pointerId
      );

    }
    catch (error) {
      /* 일부 브라우저는 pointer capture를 지원하지 않을 수 있습니다. */
    }

  }


  setStandardControlsDisabled(
    true
  );


  gifButton.classList.add(
    "recording"
  );


  gifTimer.textContent =
    "0.0초";


  gifTimer.classList.add(
    "show"
  );


  gifRecorder.start();


  updateGifTimerLoop();


  const maxDuration =
    CONFIG.gif?.maxDurationMs ||
    3000;


  gifAutoStopTimerId =
    window.setTimeout(
      () => {

        finishGifRecording();

      },
      maxDuration
    );

}


/* ============================================================
   GIF 녹화 종료 / 생성
   ============================================================ */

async function finishGifRecording(event) {

  if (event) {
    event.preventDefault();
  }


  if (!gifRecording) {
    return;
  }


  gifRecording =
    false;


  gifEncoding =
    true;


  const maxDuration =
    CONFIG.gif?.maxDurationMs ||
    3000;


  const durationMs =
    Math.max(
      0,
      Math.min(
        performance.now() -
        gifStartedAt,
        maxDuration
      )
    );


  if (gifTimerAnimationId) {

    cancelAnimationFrame(
      gifTimerAnimationId
    );

    gifTimerAnimationId =
      null;

  }


  if (gifAutoStopTimerId) {

    clearTimeout(
      gifAutoStopTimerId
    );

    gifAutoStopTimerId =
      null;

  }


  gifTimer.textContent =
    `${(durationMs / 1000).toFixed(1)}초`;


  gifButton.classList.remove(
    "recording"
  );


  gifButton.disabled =
    true;


  cameraMessage.textContent =
    "GIF를 생성하고 있습니다.";


  cameraMessage.classList.remove(
    "hidden"
  );


  /*
    사용자가 손을 놓았을 때 최종 시간을 잠깐 보여준 뒤 숨깁니다.
  */
  window.setTimeout(
    () => {

      gifTimer.classList.remove(
        "show"
      );

    },
    250
  );


  try {

    const result =
      await gifRecorder.stop(
        durationMs
      );


    if (
      !result ||
      !result.blob
    ) {

      throw new Error(
        "GIF 생성 결과가 없습니다."
      );

    }


    showResult(
      result.blob,
      "gif"
    );

  }

  catch (error) {

    console.error(
      "GIF 생성 오류:",
      error
    );


    alert(
      "GIF 생성 중 오류가 발생했습니다.\n" +
      "네트워크 연결 또는 브라우저 상태를 확인한 뒤 다시 시도해 주세요."
    );

  }

  finally {

    gifEncoding =
      false;


    gifPointerId =
      null;


    cameraMessage.classList.add(
      "hidden"
    );


    setStandardControlsDisabled(
      false
    );


    gifButton.disabled =
      false;

  }

}


/* ============================================================
   GIF 버튼 입력

   누르는 순간 녹화 시작
   놓는 순간 녹화 종료
   최대 3초에서 자동 종료
   ============================================================ */

if (gifButton) {

  gifButton.addEventListener(
    "pointerdown",
    startGifRecording
  );


  gifButton.addEventListener(
    "pointerup",
    finishGifRecording
  );


  gifButton.addEventListener(
    "pointercancel",
    finishGifRecording
  );


  gifButton.addEventListener(
    "contextmenu",
    event => {
      event.preventDefault();
    }
  );


  /* 키보드 접근성: Space / Enter를 누르고 있는 동안 촬영 */
  gifButton.addEventListener(
    "keydown",
    event => {

      if (
        event.repeat ||
        ![
          " ",
          "Enter"
        ].includes(event.key)
      ) {
        return;
      }

      startGifRecording(
        event
      );

    }
  );


  gifButton.addEventListener(
    "keyup",
    event => {

      if (
        ![
          " ",
          "Enter"
        ].includes(event.key)
      ) {
        return;
      }

      finishGifRecording(
        event
      );

    }
  );

}


/* ============================================================
   다시 찍기
   ============================================================ */

retryButton.addEventListener(
  "click",
  () => {

    clearResult();


    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  }
);


/* ============================================================
   PNG / GIF 저장
   ============================================================ */

downloadButton.addEventListener(
  "click",
  () => {

    if (!currentResultBlob) {

      alert(
        "저장할 촬영 결과가 없습니다."
      );

      return;

    }


    downloadMedia(
      currentResultBlob,
      currentResultType
    );


    backgroundManager.showToast(
      currentResultType === "gif"
        ? "GIF 저장을 시작했습니다."
        : "PNG 저장을 시작했습니다."
    );

  }
);


/* ============================================================
   공유
   ============================================================ */

shareButton.addEventListener(
  "click",
  async () => {

    if (!currentResultBlob) {

      alert(
        "공유할 촬영 결과가 없습니다."
      );

      return;

    }


    shareButton.disabled =
      true;


    try {

      const result =
        await shareMedia(
          currentResultBlob,
          currentResultType
        );


      if (
        result?.type ===
        "link"
      ) {

        backgroundManager.showToast(
          "사이트 링크가 공유되었습니다."
        );

      }

      else if (
        result?.type ===
        "file"
      ) {

        backgroundManager.showToast(
          "촬영 결과가 공유되었습니다."
        );

      }

    }

    catch (error) {

      /* 사용자가 공유창을 닫은 경우에는 오류 안내를 하지 않습니다. */
      if (
        error?.name ===
        "AbortError"
      ) {
        return;
      }


      if (
        error?.message ===
        "SHARE_UNSUPPORTED"
      ) {

        alert(
          "현재 브라우저에서는 시스템 공유 기능을 지원하지 않습니다.\n" +
          "이미지를 먼저 저장한 뒤 원하는 앱에서 공유해 주세요."
        );

      }

      else {

        console.error(
          "공유 오류:",
          error
        );


        alert(
          "공유 기능을 실행할 수 없습니다.\n" +
          "이미지를 저장한 뒤 원하는 앱에서 공유해 주세요."
        );

      }

    }

    finally {

      shareButton.disabled =
        false;

    }

  }
);


/* ============================================================
   공지 모달
   ============================================================ */

let currentNoticeIndex =
  0;


function isNoticeVisible(
  notice
) {

  if (!notice || !notice.src) {
    return false;
  }


  if (notice.alwaysVisible) {
    return true;
  }


  if (!notice.visibilityKey) {
    return true;
  }


  const visibilityConfig =
    CONFIG.noticeVisibility || {};


  return visibilityConfig[notice.visibilityKey] !== false;

}


function getNotices() {

  const notices =
    Array.isArray(
      CONFIG.notices
    )
      ? CONFIG.notices
      : [];


  /*
    1. 먼저 공개 상태인 공지만 남깁니다.

    - 체험 안내(alwaysVisible)는 항상 포함
    - 이벤트/공지 사항은 noticeVisibility 설정 적용
  */
  const visibleNotices =
    notices.filter(
      isNoticeVisible
    );


  /*
    2. config.js의 noticeOrder에 따라 표시 순서를 정합니다.

    예:
    ["event", "notice", "guide"]
    → 이벤트 → 공지 사항 → 체험 안내

    noticeOrder에 없는 항목이 나중에 추가되더라도
    삭제하지 않고 기존 notices 배열 순서대로 뒤에 붙입니다.
  */
  const noticeOrder =
    Array.isArray(
      CONFIG.noticeOrder
    )
      ? CONFIG.noticeOrder
      : [];


  const orderMap =
    new Map(
      noticeOrder.map(
        (id, index) => [
          id,
          index
        ]
      )
    );


  const originalOrderMap =
    new Map(
      notices.map(
        (notice, index) => [
          notice.id,
          index
        ]
      )
    );


  return [
    ...visibleNotices
  ].sort(
    (a, b) => {

      const aHasOrder =
        orderMap.has(
          a.id
        );


      const bHasOrder =
        orderMap.has(
          b.id
        );


      if (
        aHasOrder &&
        bHasOrder
      ) {

        return (
          orderMap.get(a.id) -
          orderMap.get(b.id)
        );

      }


      if (aHasOrder) {
        return -1;
      }


      if (bHasOrder) {
        return 1;
      }


      return (
        (originalOrderMap.get(a.id) ?? 0) -
        (originalOrderMap.get(b.id) ?? 0)
      );

    }
  );

}


function renderNotice() {

  const notices =
    getNotices();


  if (notices.length === 0) {

    noticeImage.removeAttribute(
      "src"
    );


    noticeImage.classList.add(
      "hidden"
    );


    noticeEmpty.classList.remove(
      "hidden"
    );


    noticeCounter.textContent =
      "";


    noticePrevButton.disabled =
      true;


    noticeNextButton.disabled =
      true;


    return;

  }


  currentNoticeIndex =
    (
      currentNoticeIndex +
      notices.length
    ) %
    notices.length;


  const notice =
    notices[currentNoticeIndex];


  noticeImage.src =
    notice.src;


  noticeImage.alt =
    notice.name ||
    `공지 ${currentNoticeIndex + 1}`;


  noticeImage.classList.remove(
    "hidden"
  );


  noticeEmpty.classList.add(
    "hidden"
  );


  noticeCounter.textContent =
    `${currentNoticeIndex + 1} / ${notices.length}`;


  const hasMultiple =
    notices.length > 1;


  noticePrevButton.disabled =
    !hasMultiple;


  noticeNextButton.disabled =
    !hasMultiple;

}


function openNoticeModal() {

  if (
    gifRecording ||
    gifEncoding
  ) {
    return;
  }


  if (getNotices().length === 0) {
    return;
  }


  renderNotice();


  noticeModal.classList.add(
    "show"
  );


  noticeModal.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "modal-open"
  );


  window.setTimeout(
    () => {
      noticeCloseButton.focus();
    },
    0
  );

}


function closeNoticeModal() {

  noticeModal.classList.remove(
    "show"
  );


  noticeModal.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "modal-open"
  );


  if (noticeButton) {
    noticeButton.focus();
  }


  /*
    사이트 첫 진입에서 자동으로 열린 공지를 닫은 뒤
    아직 카메라 초기화를 시작하지 않았다면 카메라를 실행합니다.

    이후 사용자가 공지 버튼으로 다시 모달을 열고 닫아도
    cameraInitializationStarted가 true이므로 중복 실행되지 않습니다.
  */
  if (!cameraInitializationStarted) {

    initializeCamera().catch(
      error => {
        console.error(
          "카메라 초기화 오류:",
          error
        );
      }
    );

  }

}


function showPreviousNotice() {

  const notices =
    getNotices();


  if (notices.length <= 1) {
    return;
  }


  currentNoticeIndex =
    (
      currentNoticeIndex -
      1 +
      notices.length
    ) %
    notices.length;


  renderNotice();

}


function showNextNotice() {

  const notices =
    getNotices();


  if (notices.length <= 1) {
    return;
  }


  currentNoticeIndex =
    (
      currentNoticeIndex +
      1
    ) %
    notices.length;


  renderNotice();

}


if (noticeButton) {

  noticeButton.addEventListener(
    "click",
    openNoticeModal
  );

}


noticePrevButton.addEventListener(
  "click",
  showPreviousNotice
);


noticeNextButton.addEventListener(
  "click",
  showNextNotice
);


noticeCloseButton.addEventListener(
  "click",
  closeNoticeModal
);


noticeModalBackdrop.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      noticeModalBackdrop
    ) {

      closeNoticeModal();

    }

  }
);


document.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Escape" &&
      noticeModal.classList.contains(
        "show"
      )
    ) {

      closeNoticeModal();

    }

  }
);


/* ============================================================
   세로 / 가로 화면 회전 대응
   ============================================================ */

let viewportSyncTimerId =
  null;


function syncViewportLayout() {

  const isLandscape =
    window.innerWidth >
    window.innerHeight;


  document.documentElement.classList.toggle(
    "is-landscape",
    isLandscape
  );


  /*
    CSS 레이아웃이 적용된 뒤 AR Canvas 크기를 다시 계산합니다.
    크기가 실제로 바뀐 경우 ar.js에서 추적 좌표도 안전하게 초기화합니다.
  */
  window.requestAnimationFrame(
    () => {

      arTracker.refreshLayout();

    }
  );

}


function scheduleViewportLayoutSync() {

  if (viewportSyncTimerId) {

    clearTimeout(
      viewportSyncTimerId
    );

  }


  viewportSyncTimerId =
    window.setTimeout(
      () => {

        viewportSyncTimerId =
          null;

        syncViewportLayout();

      },
      100
    );

}


window.addEventListener(
  "resize",
  scheduleViewportLayoutSync,
  {
    passive: true
  }
);


window.addEventListener(
  "orientationchange",
  scheduleViewportLayoutSync,
  {
    passive: true
  }
);


if (window.visualViewport) {

  window.visualViewport.addEventListener(
    "resize",
    scheduleViewportLayoutSync,
    {
      passive: true
    }
  );

}


/* ============================================================
   페이지 실행
   ============================================================ */

syncViewportLayout();
initialize();
