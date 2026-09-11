/*
 ============================================================
 사이트 주요 설정
 ============================================================

 선택 모드는 다음 순서로 반복됩니다.

 배경 → 캐릭터 → 움직임 → AR → 배경

 중요:
 네 모드는 서로 '동시에 적용되지 않는 독립 모드'입니다.
 예를 들어 배경을 적용한 상태에서 캐릭터를 선택하면
 기존 배경은 자동으로 해제되고 캐릭터만 적용됩니다.
*/

export const CONFIG = {

  /*
   ----------------------------------------------------------
   최종 저장 사진 해상도
   ----------------------------------------------------------
  */

  outputWidth: 1440,
  outputHeight: 1080,


  /*
   기본 카메라

   user        = 전면 카메라
   environment = 후면 카메라
  */

  facingMode: "user",


  /*
   전면 카메라 촬영 결과도
   미리보기처럼 거울 방향으로 저장합니다.
  */

  mirrorFrontCamera: true,


  /*
   ----------------------------------------------------------
   선택 모드
   ----------------------------------------------------------

   itemsKey:
   해당 모드에서 사용할 항목 배열 이름입니다.
  */

  selectionModes: [

    {
      id: "background",
      buttonLabel: "배경",
      title: "배경을 선택해 주세요",
      ariaLabel: "배경 선택",
      itemsKey: "backgrounds",
      emptyText: "등록된 배경이 없습니다."
    },

    {
      id: "character",
      buttonLabel: "캐릭터",
      title: "캐릭터를 선택해 주세요",
      ariaLabel: "캐릭터 선택",
      itemsKey: "characters",
      emptyText: "등록된 캐릭터가 없습니다."
    },

    {
      id: "motion",
      buttonLabel: "움직임",
      title: "움직이는 배경 및 캐릭터를 선택해 주세요",
      ariaLabel: "움직이는 배경 및 캐릭터 선택",
      itemsKey: "motionAssets",
      emptyText: "등록된 움직이는 배경 또는 캐릭터가 없습니다."
    },

    {
      id: "ar",
      buttonLabel: "AR",
      title: "AR 효과를 선택해 주세요",
      ariaLabel: "AR 효과 선택",
      itemsKey: "arAssets",
      emptyText: "등록된 AR 효과가 없습니다."
    }

  ],


  /*
   ----------------------------------------------------------
   1차: 정적 배경
   ----------------------------------------------------------

   src       = 실제 촬영용 고해상도 원본
   thumbnail = 선택창용 저해상도 WebP
  */

  backgrounds: [

    {
      id: "none",
      name: "배경 없음",
      src: null,
      thumbnail: null
    },

    {
      id: "20years",
      name: "희망의 과학싹잔치 20주년",

      src:
        "./assets/backgrounds/static/20years.png",

      thumbnail:
        "./assets/backgrounds/thumbnails/thumb-20years.webp"
    },

    {
      id: "bell",
      name: "전화기 발명 이야기",

      src:
        "./assets/backgrounds/static/bell.png",

      thumbnail:
        "./assets/backgrounds/thumbnails/thumb-bell.webp"
    },

    {
      id: "drama",
      name: "과학연극",

      src:
        "./assets/backgrounds/static/20ybell.png",

      thumbnail:
        "./assets/backgrounds/thumbnails/thumb-20ybell.webp"
    }

  ],


  /*
   ----------------------------------------------------------
   2차: 정적 캐릭터
   ----------------------------------------------------------

   첫 번째 '캐릭터 없음'을 누르면 현재 적용 중인 효과가
   모두 해제되어 카메라 영상만 남습니다.
  */

  characters: [

    {
      id: "none",
      name: "캐릭터 없음",
      src: null,
      thumbnail: null
    },

    {
      id: "einstein",
      name: "아인슈타인",

      src:
        "./assets/characters/static/Einstein.png",

      thumbnail:
        "./assets/characters/thumbnails/thumb-einstein.webp",

      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    },

    {
      id: "galilei",
      name: "갈릴레이",

      src:
        "./assets/characters/static/Galilei.png",

      thumbnail:
        "./assets/characters/thumbnails/thumb-galilei.webp",

      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    },

    {
      id: "newton",
      name: "뉴턴",

      src:
        "./assets/characters/static/Newton.png",

      thumbnail:
        "./assets/characters/thumbnails/thumb-newton.webp",

      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    }

  ],


  /*
   ----------------------------------------------------------
   3차: 움직이는 배경 및 캐릭터
   ----------------------------------------------------------

   아직 실제 움직임 자료는 등록하지 않았지만
   '움직임 없음' 항목은 항상 표시합니다.

   이후 실제 자료를 이 배열 뒤에 추가하면 됩니다.
  */

  motionAssets: [

    {
      id: "none",
      name: "움직임 없음",
      src: null,
      thumbnail: null,
      type: "none"
    }

  ],


  /*
   ----------------------------------------------------------
   4차: 얼굴인식 AR
   ----------------------------------------------------------

   아직 실제 AR 자료는 등록하지 않았지만
   'AR 없음' 항목은 항상 표시합니다.
  */

  arAssets: [

    {
      id: "none",
      name: "AR 없음",
      src: null,
      thumbnail: null,
      type: "none"
    }

  ]

};
