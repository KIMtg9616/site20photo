/*
 ============================================================
 사이트 주요 설정
 ============================================================

 현재 1차 기능은 정적 배경 촬영입니다.

 이번 수정에서는 향후 2~4차 기능을 쉽게 붙일 수 있도록
 선택 모드를 미리 분리해 둡니다.

 배경 → 캐릭터 → 움직임 → AR → 배경
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

   user        = 전면
   environment = 후면
  */

  facingMode: "user",


  /*
   전면 카메라 촬영 결과를
   미리보기처럼 거울 방향으로 저장
  */

  mirrorFrontCamera: true,


  /*
   ----------------------------------------------------------
   선택 모드

   itemsKey:
   이 모드에서 어떤 배열의 썸네일을 보여줄지 결정합니다.

   buttonLabel:
   왼쪽 버튼 아래에 표시되는 짧은 이름입니다.
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

   src
   = 실제 카메라와 합성되는 고해상도 원본

   thumbnail
   = 선택창에서만 사용하는 320×240 WebP
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

   현재는 자료가 없으므로 빈 배열입니다.

   나중에 아래 형식으로 추가하면 선택창에 자동 표시됩니다.

   {
     id: "character-01",
     name: "캐릭터 이름",
     src: "./assets/characters/static/character-01.png",
     thumbnail: "./assets/characters/thumbnails/thumb-character-01.webp"
   }
  */

  characters: [],


  /*
   ----------------------------------------------------------
   3차: 움직이는 배경 및 캐릭터

   이후 Animated WebP / WebM 등의 자료를 등록합니다.

   예시 데이터 구조에는 type을 추가해서
   animated-background / animated-character를 구분할 수 있습니다.
  */

  motionAssets: [],


  /*
   ----------------------------------------------------------
   4차: 얼굴인식 AR

   이후 AR 스티커/효과의 썸네일과 설정값을 등록합니다.
  */

  arAssets: []

};
