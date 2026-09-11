import { CONFIG } from "./config.js";


/*
 ============================================================
 카메라 스트림 관리
 ============================================================
*/

let cameraStream = null;


/*
 현재 사용 중인 카메라 방향

 user:
 전면 카메라

 environment:
 후면 카메라
*/

let currentFacingMode =
  CONFIG.facingMode || "user";



/*
 ============================================================
 카메라 실행
 ============================================================
*/

export async function startCamera(
  videoElement,
  facingMode = currentFacingMode
) {

  try {


    /*
      기존 카메라 스트림 종료

      스마트폰에서 전면 ↔ 후면 카메라를 변경할 때
      기존 스트림을 먼저 완전히 종료하는 것이 중요합니다.
    */

    stopCamera();



    /*
      현재 사용할 카메라 방향 저장
    */

    currentFacingMode =
      facingMode;


    /*
      capture.js에서도 현재 방향을 확인할 수 있도록
      CONFIG 값을 함께 변경합니다.
    */

    CONFIG.facingMode =
      currentFacingMode;



    /*
      카메라 설정
    */

    const constraints = {

      audio: false,

      video: {

        facingMode: {
          ideal: currentFacingMode
        },

        width: {
          ideal: CONFIG.outputWidth
        },

        height: {
          ideal: CONFIG.outputHeight
        }

      }

    };



    /*
      카메라 권한 요청 및 실행
    */

    cameraStream =
      await navigator.mediaDevices.getUserMedia(
        constraints
      );



    videoElement.srcObject =
      cameraStream;



    /*
      iOS Safari 대응
    */

    await videoElement.play();



    return {

      success: true,

      stream: cameraStream,

      facingMode: currentFacingMode

    };

  }


  catch (error) {


    console.error(
      "카메라 실행 오류:",
      error
    );


    return {

      success: false,

      error

    };

  }

}



/*
 ============================================================
 전면 ↔ 후면 카메라 전환
 ============================================================
*/

export async function switchCamera(
  videoElement
) {


  /*
    현재 전면 카메라라면 후면으로,
    후면이라면 전면으로 변경합니다.
  */

  const nextFacingMode =

    currentFacingMode === "user"

      ? "environment"

      : "user";



  /*
    기존 방향 저장

    전환에 실패하면 기존 카메라로 되돌리기 위해 사용합니다.
  */

  const previousFacingMode =
    currentFacingMode;



  /*
    새로운 카메라 실행
  */

  const result =
    await startCamera(
      videoElement,
      nextFacingMode
    );



  /*
    정상적으로 전환되었다면 그대로 반환
  */

  if (result.success) {

    return result;

  }



  /*
    전환할 카메라가 없거나
    브라우저가 해당 카메라를 지원하지 않을 경우

    기존 카메라를 다시 실행합니다.
  */

  console.warn(
    "카메라 전환에 실패하여 기존 카메라로 돌아갑니다."
  );


  return await startCamera(
    videoElement,
    previousFacingMode
  );

}



/*
 ============================================================
 현재 카메라 방향
 ============================================================
*/

export function getCurrentFacingMode() {

  return currentFacingMode;

}



/*
 ============================================================
 카메라 종료
 ============================================================
*/

export function stopCamera() {


  if (!cameraStream) {

    return;

  }


  cameraStream
    .getTracks()
    .forEach(
      track => track.stop()
    );


  cameraStream =
    null;

}



/*
 ============================================================
 카메라 실행 여부
 ============================================================
*/

export function isCameraRunning() {


  return Boolean(

    cameraStream &&

    cameraStream.active

  );

}
