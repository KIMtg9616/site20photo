import { CONFIG } from "./config.js";


/*
 ============================================================
 선택창 관리
 ============================================================

 파일 이름은 기존 구조를 유지하기 위해 backgrounds.js를
 그대로 사용합니다.

 현재 실제 적용 기능:
 1. 정적 배경
 2. 정적 캐릭터

 이후 확장 예정:
 3. 움직이는 배경 및 캐릭터
 4. AR
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
      현재 선택 모드는 첫 번째 모드인 배경
    */
    this.currentModeId =
      CONFIG.selectionModes[0]?.id ||
      "background";


    /*
      모드별 선택값을 각각 기억합니다.
    */
    this.selectedItems = {

      background:
        CONFIG.backgrounds[0] ||
        null,

      character:
        CONFIG.characters[0] ||
        null,

      motion:
        null,

      ar:
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
 현재 모드 정보
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
 현재 모드의 항목 배열
 ============================================================
 */

  getCurrentItems() {

    const mode =
      this.getModeConfig();


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
         작은 썸네일만 로딩
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
 */

  select(
    item,
    selectedButton
  ) {

    this.selectedItems[
      this.currentModeId
    ] =
      item;


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


    /* 정적 배경 */
    if (
      this.currentModeId ===
      "background"
    ) {

      this.applyBackground(
        item
      );

      return;

    }


    /* 정적 캐릭터 */
    if (
      this.currentModeId ===
      "character"
    ) {

      this.applyCharacter(
        item
      );

      return;

    }


    /*
      움직임 / AR은 다음 단계에서 실제 레이어를 연결합니다.
    */
    this.showToast(
      `${item.name} 선택됨`
    );

  }


  /*
 ============================================================
 정적 배경 적용
 ============================================================
 */

  applyBackground(background) {

    if (!background.src) {

      this.overlayElement.removeAttribute(
        "src"
      );


      this.overlayElement.style.display =
        "none";


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

 기본 크기는 최종 사진 폭의 40%이며
 오른쪽 아래에 표시됩니다.
 ============================================================
 */

  applyCharacter(character) {

    if (!this.characterOverlayElement) {

      return;

    }


    if (!character.src) {

      this.characterOverlayElement.removeAttribute(
        "src"
      );


      this.characterOverlayElement.style.display =
        "none";


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
 현재 선택된 정적 배경
 ============================================================
 */

  getSelectedBackground() {

    return (
      this.selectedItems.background ||
      null
    );

  }


  /*
 ============================================================
 현재 선택된 정적 캐릭터
 ============================================================
 */

  getSelectedCharacter() {

    return (
      this.selectedItems.character ||
      null
    );

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
