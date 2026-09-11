import { CONFIG } from "./config.js";


/*
 ============================================================
 선택창 관리
 ============================================================

 파일명은 기존 구조를 유지하기 위해 backgrounds.js를 사용합니다.

 현재 실제 적용 기능:
 1. 정적 배경
 2. 정적 캐릭터

 이후 확장 예정:
 3. 움직이는 배경 및 캐릭터
 4. AR

 중요:
 배경 / 캐릭터 / 움직임 / AR은 서로 독립적인 단일 선택 모드입니다.
 한 모드에서 실제 항목을 선택하면 다른 모드의 적용은 즉시 해제됩니다.
*/

export class BackgroundManager {

  constructor(
    listElement,
    overlayElement,
    titleElement = null,
    characterOverlayElement = null
  ) {

    this.listElement =
      listElement;

    this.overlayElement =
      overlayElement;

    this.titleElement =
      titleElement;

    this.characterOverlayElement =
      characterOverlayElement;


    /*
      현재 보고 있는 선택 모드
    */
    this.currentModeId =
      CONFIG.selectionModes[0]?.id ||
      "background";


    /*
      실제로 카메라에 적용 중인 모드입니다.

      null      = 아무 효과도 적용하지 않음
      background = 배경만 적용
      character  = 캐릭터만 적용
      motion     = 움직임만 적용(향후)
      ar         = AR만 적용(향후)
    */
    this.activeModeId =
      null;


    /*
      모든 모드는 기본적으로 '없음' 항목을 선택합니다.
    */
    this.selectedItems = {

      background:
        this.getNoneItem("background") ||
        null,

      character:
        this.getNoneItem("character") ||
        null,

      motion:
        this.getNoneItem("motion") ||
        null,

      ar:
        this.getNoneItem("ar") ||
        null

    };


    this.toastElement =
      document.getElementById(
        "backgroundToast"
      );


    this.toastTimer =
      null;

  }


  /*
 ============================================================
 현재 모드 설정
 ============================================================

 모드 버튼을 눌러 선택창을 바꾸는 것만으로는
 기존 효과를 제거하지 않습니다.

 실제 다른 항목을 선택하는 순간 이전 효과가 해제됩니다.
 ============================================================
 */

  setMode(modeId) {

    const mode =
      this.getModeConfig(modeId);


    if (!mode) {

      return;

    }


    this.currentModeId =
      mode.id;


    this.render();

  }


  /*
 ============================================================
 모드 정보 가져오기
 ============================================================
 */

  getModeConfig(
    modeId = this.currentModeId
  ) {

    return (
      CONFIG.selectionModes.find(
        mode => mode.id === modeId
      ) ||
      CONFIG.selectionModes[0] ||
      null
    );

  }


  /*
 ============================================================
 특정 모드의 항목 배열
 ============================================================
 */

  getItemsForMode(modeId) {

    const mode =
      this.getModeConfig(modeId);


    if (!mode) {

      return [];

    }


    const items =
      CONFIG[mode.itemsKey];


    return Array.isArray(items)
      ? items
      : [];

  }


  /*
 ============================================================
 현재 모드의 항목 배열
 ============================================================
 */

  getCurrentItems() {

    return this.getItemsForMode(
      this.currentModeId
    );

  }


  /*
 ============================================================
 각 모드의 '없음' 항목 찾기
 ============================================================
 */

  getNoneItem(modeId) {

    const items =
      this.getItemsForMode(modeId);


    return (
      items.find(
        item => item.id === "none"
      ) ||
      null
    );

  }


  /*
 ============================================================
 선택창 다시 그리기
 ============================================================
 */

  render() {

    const mode =
      this.getModeConfig();


    if (!mode) {

      return;

    }


    if (this.titleElement) {

      this.titleElement.textContent =
        mode.title;

    }


    this.listElement.setAttribute(
      "aria-label",
      mode.ariaLabel
    );


    this.listElement.innerHTML =
      "";


    const items =
      this.getCurrentItems();


    if (items.length === 0) {

      this.renderEmptyState(
        mode.emptyText
      );

      return;

    }


    const selectedItem =
      this.selectedItems[
        this.currentModeId
      ];


    items.forEach(
      item => {

        const button =
          document.createElement(
            "button"
          );


        button.type =
          "button";


        button.className =
          "background-item";


        button.dataset.itemId =
          item.id;


        button.setAttribute(
          "aria-label",
          `${item.name} 선택`
        );


        const isSelected =
          Boolean(
            selectedItem &&
            selectedItem.id === item.id
          );


        button.setAttribute(
          "aria-pressed",
          isSelected
            ? "true"
            : "false"
        );


        if (isSelected) {

          button.classList.add(
            "selected"
          );

        }


        /*
         --------------------------------------------------------
         없음 항목
         --------------------------------------------------------
        */

        if (!item.thumbnail) {

          const noneBox =
            document.createElement(
              "div"
            );


          noneBox.className =
            "background-none";


          noneBox.textContent =
            "없음";


          button.appendChild(
            noneBox
          );

        }


        /*
         --------------------------------------------------------
         저해상도 썸네일
         --------------------------------------------------------
        */

        else {

          const image =
            document.createElement(
              "img"
            );


          image.className =
            "background-thumbnail";


          image.src =
            item.thumbnail;


          image.alt =
            "";


          image.loading =
            "lazy";


          image.decoding =
            "async";


          image.width =
            320;


          image.height =
            240;


          image.draggable =
            false;


          image.addEventListener(
            "error",
            () => {

              image.style.display =
                "none";


              button.classList.add(
                "image-load-error"
              );

            }
          );


          button.appendChild(
            image
          );

        }


        button.addEventListener(
          "click",
          () => {

            this.select(
              item,
              button
            );

          }
        );


        this.listElement.appendChild(
          button
        );

      }
    );

  }


  /*
 ============================================================
 자료가 없는 모드 안내
 ============================================================
 */

  renderEmptyState(message) {

    const empty =
      document.createElement(
        "div"
      );


    empty.className =
      "selector-empty";


    empty.textContent =
      message;


    this.listElement.appendChild(
      empty
    );

  }


  /*
 ============================================================
 항목 선택
 ============================================================

 핵심 동작:

 배경 A 적용
 → 캐릭터 아인슈타인 선택
 → 배경 A 자동 해제
 → 아인슈타인만 표시

 캐릭터 적용
 → 배경 B 선택
 → 캐릭터 자동 해제
 → 배경 B만 표시

 '없음'을 선택하면 현재 적용 중인 모든 효과가 제거됩니다.
 ============================================================
 */

  select(
    item,
    selectedButton
  ) {

    const selectedModeId =
      this.currentModeId;


    /*
      다른 모드의 선택 상태 및 화면 효과를 모두 먼저 제거합니다.
    */
    this.clearAllSelectionsAndEffects();


    /*
      현재 모드에서 선택한 항목을 저장합니다.
    */
    this.selectedItems[
      selectedModeId
    ] =
      item;


    /*
      현재 선택창의 버튼 표시를 갱신합니다.
    */
    const buttons =
      this.listElement.querySelectorAll(
        ".background-item"
      );


    buttons.forEach(
      button => {

        button.classList.remove(
          "selected"
        );


        button.setAttribute(
          "aria-pressed",
          "false"
        );

      }
    );


    selectedButton.classList.add(
      "selected"
    );


    selectedButton.setAttribute(
      "aria-pressed",
      "true"
    );


    /*
      '없음'을 선택한 경우
      아무 모드도 활성화하지 않습니다.
    */
    if (
      !item ||
      item.id === "none" ||
      !item.src
    ) {

      this.activeModeId =
        null;


      this.showNoneToast(
        selectedModeId
      );


      return;

    }


    /*
      실제 항목을 선택한 경우에는
      해당 모드만 활성화합니다.
    */
    this.activeModeId =
      selectedModeId;


    /* 정적 배경 */
    if (
      selectedModeId ===
      "background"
    ) {

      this.applyBackground(
        item
      );

      return;

    }


    /* 정적 캐릭터 */
    if (
      selectedModeId ===
      "character"
    ) {

      this.applyCharacter(
        item
      );

      return;

    }


    /*
      움직임 / AR은 다음 단계에서 실제 렌더링 기능을 연결합니다.
      지금도 다른 모드 효과는 이미 완전히 해제된 상태입니다.
    */
    this.showToast(
      `${item.name} 선택됨`
    );

  }


  /*
 ============================================================
 모든 모드 선택 상태와 현재 화면 효과 제거
 ============================================================
 */

  clearAllSelectionsAndEffects() {

    /*
      각 모드의 선택값을 다시 '없음'으로 돌립니다.
    */
    CONFIG.selectionModes.forEach(
      mode => {

        this.selectedItems[
          mode.id
        ] =
          this.getNoneItem(
            mode.id
          ) ||
          null;

      }
    );


    this.activeModeId =
      null;


    this.clearBackgroundOverlay();


    this.clearCharacterOverlay();


    /*
      향후 움직임/AR 레이어를 구현하면
      이 메서드 안에서 함께 제거하면 됩니다.
    */

  }


  /*
 ============================================================
 배경 레이어 제거
 ============================================================
 */

  clearBackgroundOverlay() {

    if (!this.overlayElement) {

      return;

    }


    this.overlayElement.removeAttribute(
      "src"
    );


    this.overlayElement.style.display =
      "none";

  }


  /*
 ============================================================
 캐릭터 레이어 제거
 ============================================================
 */

  clearCharacterOverlay() {

    if (!this.characterOverlayElement) {

      return;

    }


    this.characterOverlayElement.removeAttribute(
      "src"
    );


    this.characterOverlayElement.style.display =
      "none";

  }


  /*
 ============================================================
 정적 배경 적용
 ============================================================
 */

  applyBackground(background) {

    if (
      !background ||
      !background.src
    ) {

      this.clearBackgroundOverlay();


      this.activeModeId =
        null;


      this.showToast(
        "배경을 사용하지 않습니다."
      );


      return;

    }


    this.overlayElement.src =
      background.src;


    this.overlayElement.style.display =
      "block";


    this.showToast(
      `${background.name} 배경을 선택했습니다.`
    );

  }


  /*
 ============================================================
 정적 캐릭터 적용
 ============================================================
 */

  applyCharacter(character) {

    if (!this.characterOverlayElement) {

      return;

    }


    if (
      !character ||
      !character.src
    ) {

      this.clearCharacterOverlay();


      this.activeModeId =
        null;


      this.showToast(
        "캐릭터를 사용하지 않습니다."
      );


      return;

    }


    const placement =
      character.placement || {};


    const widthRatio =
      placement.widthRatio ??
      0.40;


    const rightRatio =
      placement.rightRatio ??
      0.02;


    const bottomRatio =
      placement.bottomRatio ??
      0;


    this.characterOverlayElement.style.setProperty(
      "--character-width",
      `${widthRatio * 100}%`
    );


    this.characterOverlayElement.style.setProperty(
      "--character-right",
      `${rightRatio * 100}%`
    );


    this.characterOverlayElement.style.setProperty(
      "--character-bottom",
      `${bottomRatio * 100}%`
    );


    this.characterOverlayElement.src =
      character.src;


    this.characterOverlayElement.style.display =
      "block";


    this.showToast(
      `${character.name} 캐릭터를 선택했습니다.`
    );

  }


  /*
 ============================================================
 '없음' 선택 알림
 ============================================================
 */

  showNoneToast(modeId) {

    const messages = {

      background:
        "배경을 사용하지 않습니다.",

      character:
        "캐릭터를 사용하지 않습니다.",

      motion:
        "움직임을 사용하지 않습니다.",

      ar:
        "AR 효과를 사용하지 않습니다."

    };


    this.showToast(
      messages[modeId] ||
      "효과를 사용하지 않습니다."
    );

  }


  /*
 ============================================================
 하단 Toast
 ============================================================
 */

  showToast(message) {

    if (!this.toastElement) {

      return;

    }


    if (this.toastTimer) {

      clearTimeout(
        this.toastTimer
      );


      this.toastTimer =
        null;

    }


    this.toastElement.classList.remove(
      "show"
    );


    this.toastElement.textContent =
      message;


    void this.toastElement.offsetWidth;


    this.toastElement.classList.add(
      "show"
    );


    this.toastTimer =
      window.setTimeout(
        () => {

          this.toastElement.classList.remove(
            "show"
          );


          this.toastTimer =
            null;

        },
        1500
      );

  }


  /*
 ============================================================
 현재 실제로 적용 중인 정적 배경
 ============================================================
 */

  getSelectedBackground() {

    if (
      this.activeModeId !==
      "background"
    ) {

      return null;

    }


    const background =
      this.selectedItems.background;


    return (
      background &&
      background.id !== "none" &&
      background.src
    )
      ? background
      : null;

  }


  /*
 ============================================================
 현재 실제로 적용 중인 정적 캐릭터
 ============================================================
 */

  getSelectedCharacter() {

    if (
      this.activeModeId !==
      "character"
    ) {

      return null;

    }


    const character =
      this.selectedItems.character;


    return (
      character &&
      character.id !== "none" &&
      character.src
    )
      ? character
      : null;

  }


  /*
 ============================================================
 현재 활성 모드
 ============================================================
 */

  getActiveModeId() {

    return this.activeModeId;

  }


  /*
 ============================================================
 모든 모드 선택값
 ============================================================
 */

  getSelectedItems() {

    return {
      ...this.selectedItems
    };

  }

}
