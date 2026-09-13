/*
 ============================================================
 사이트 주요 설정
 ============================================================

 선택 모드는 다음 순서로 반복됩니다.

 배경 → 캐릭터 → 움직임 → AR → 배경

 중요:
 네 모드는 서로 동시에 적용되지 않는 독립 모드입니다.
 다른 모드에서 실제 항목을 선택하면 기존 효과는 자동 해제됩니다.
*/

export const CONFIG = {

  outputWidth: 1440,
  outputHeight: 1080,

  facingMode: "user",
  mirrorFrontCamera: true,

  /*
   GIF 촬영 설정

   - 버튼을 누르고 있는 동안 녹화
   - 최대 3초
   - 스마트폰 성능과 파일 크기를 고려해 480×360 / 8fps 사용
   - 최종 GIF는 무한 반복
  */
  gif: {
    width: 480,
    height: 360,
    fps: 8,
    maxDurationMs: 3000,
    colors: 128
  },

  /*
   캐릭터와 움직이는 캐릭터에서만
   카메라 좌측 상단에 표시되는 타이틀 이미지입니다.
  */
  characterTitle: {
    src: "./assets/logo/title.png",
    widthRatio: 0.34,
    leftRatio: 0.02,
    topRatio: 0.02
  },


  /*
   공지 공개 설정

   - guide(체험 안내)는 항상 공개됩니다.
   - event(이벤트), notice(공지 사항)는 아래 값으로 공개 여부를 선택합니다.

   true  = 공개
   false = 비공개
  */
  noticeVisibility: {
    event: true,
    notice: true
  },

  /*
   사이트에 처음 들어왔을 때 공지 모달 자동 표시

   true  = 사이트 진입 즉시 공지 표시
   false = 공지 버튼을 눌렀을 때만 표시

   체험 안내는 항상 공개되므로 기본값은 true입니다.
  */
  noticeAutoOpen: true,

  /*
   공지 모달 표시 순서

   아래 배열에 공지 id를 원하는 순서대로 작성하면 됩니다.

   사용 가능한 id:
   - "event"  = 이벤트
   - "notice" = 공지 사항
   - "guide"  = 체험 안내

   예시 1) 이벤트 → 공지 사항 → 체험 안내
   noticeOrder: ["event", "notice", "guide"]

   예시 2) 체험 안내 → 이벤트 → 공지 사항
   noticeOrder: ["guide", "event", "notice"]

   공개 여부가 false인 항목은 순서 배열에 있어도 자동으로 제외됩니다.
   체험 안내(guide)는 항상 공개됩니다.
  */
  noticeOrder: [
    "event",
    "notice",
    "guide"
  ],

  /*
   공지 이미지 목록

   guide  : 항상 공개
   event  : CONFIG.noticeVisibility.event 값으로 공개 여부 결정
   notice : CONFIG.noticeVisibility.notice 값으로 공개 여부 결정
  */
  notices: [
    {
      id: "guide",
      name: "체험 안내",
      src: "./assets/notices/guide.jpg",
      alwaysVisible: true
    },
    {
      id: "event",
      name: "이벤트",
      src: "./assets/notices/event.jpg",
      visibilityKey: "event"
    },
    {
      id: "notice",
      name: "공지 사항",
      src: "./assets/notices/notice.jpg",
      visibilityKey: "notice"
    }
  ],

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

  /* 1차: 정적 배경 */
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
      src: "./assets/backgrounds/static/20years.png",
      thumbnail: "./assets/backgrounds/thumbnails/thumb-20years.webp"
    },
    {
      id: "bell",
      name: "전화기 발명 이야기",
      src: "./assets/backgrounds/static/bell.png",
      thumbnail: "./assets/backgrounds/thumbnails/thumb-bell.webp"
    },
    {
      id: "drama",
      name: "과학연극",
      src: "./assets/backgrounds/static/20ybell.png",
      thumbnail: "./assets/backgrounds/thumbnails/thumb-20ybell.webp"
    }
  ],

  /* 2차: 정적 캐릭터 */
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
      src: "./assets/characters/static/Einstein.png",
      thumbnail: "./assets/characters/thumbnails/thumb-einstein.webp",
      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    },
    {
      id: "galilei",
      name: "갈릴레이",
      src: "./assets/characters/static/Galilei.png",
      thumbnail: "./assets/characters/thumbnails/thumb-galilei.webp",
      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    },
    {
      id: "newton",
      name: "뉴턴",
      src: "./assets/characters/static/Newton.png",
      thumbnail: "./assets/characters/thumbnails/thumb-newton.webp",
      placement: {
        widthRatio: 0.40,
        rightRatio: 0.02,
        bottomRatio: 0.00
      }
    }
  ],

  /*
   3차: 움직이는 배경 및 움직이는 캐릭터

   type:
   animated-background = 카메라 전체에 움직이는 배경 적용
   animated-character  = 오른쪽 아래에 움직이는 캐릭터 적용
  */
  motionAssets: [
    {
      id: "none",
      name: "움직임 없음",
      src: null,
      thumbnail: null,
      type: "none"
    },
    {
      id: "electric",
      name: "전자기유도",
      src: "./assets/animated/backgrounds/electric.webp",
      thumbnail: "./assets/animated/thumbnails/thumb-electric.webp",
      type: "animated-background"
    },
    {
      id: "grassmove",
      name: "풀 배경",
      src: "./assets/animated/backgrounds/grassmove.webp",
      thumbnail: "./assets/animated/thumbnails/thumb-grassmove.webp",
      type: "animated-background"
    },
    {
      id: "spacemove",
      name: "우주배경",
      src: "./assets/animated/backgrounds/spacemove.webp",
      thumbnail: "./assets/animated/thumbnails/thumb-spacemove.webp",
      type: "animated-background"
    },
    {
      id: "applemove",
      name: "뉴턴의 사과",
      src: "./assets/animated/characters/applemove.webp",
      thumbnail: "./assets/animated/thumbnails/thumb-applemove.webp",
      type: "animated-character",
      placement: {
        widthRatio: 0.34,
        rightRatio: 0.03,
        bottomRatio: 0.02
      }
    },
    {
      id: "catmove",
      name: "고양이",
      src: "./assets/animated/characters/catmove.webp",
      thumbnail: "./assets/animated/thumbnails/thumb-catmove.webp",
      type: "animated-character",
      placement: {
        widthRatio: 0.36,
        rightRatio: 0.03,
        bottomRatio: 0.02
      }
    }
  ],

  /*
   4차: 얼굴인식 AR

   arKind:
   crown    = 머리 위 왕관
   glasses  = 눈 위치에 맞춰 안경
   headband = 머리와 얼굴 주위에 맞춘 머리띠
  */
  arAssets: [
    {
      id: "none",
      name: "AR 없음",
      src: null,
      thumbnail: null,
      type: "none"
    },
    {
      id: "crown",
      name: "왕관",
      src: "./assets/ar/effects/crown.png",
      thumbnail: "./assets/ar/thumbnails/thumb-crown.webp",
      type: "ar",
      arKind: "crown",
      scale: 1.45
    },
    {
      id: "glasses1",
      name: "안경1",
      src: "./assets/ar/effects/glasses1.png",
      thumbnail: "./assets/ar/thumbnails/thumb-glasses1.webp",
      type: "ar",
      arKind: "glasses",
      scale: 2.35
    },
    {
      id: "glasses2",
      name: "안경2",
      src: "./assets/ar/effects/glasses2.png",
      thumbnail: "./assets/ar/thumbnails/thumb-glasses2.webp",
      type: "ar",
      arKind: "glasses",
      scale: 2.35
    },
    {
      id: "head1",
      name: "머리띠1",
      src: "./assets/ar/effects/head1.png",
      thumbnail: "./assets/ar/thumbnails/thumb-head1.webp",
      type: "ar",
      arKind: "headband",
      scale: 1.65
    },
    {
      id: "head2",
      name: "머리띠2",
      src: "./assets/ar/effects/head2.png",
      thumbnail: "./assets/ar/thumbnails/thumb-head2.webp",
      type: "ar",
      arKind: "headband",
      scale: 1.70
    }
  ]

};
