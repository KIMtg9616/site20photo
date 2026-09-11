import { CONFIG } from "./config.js";


/*
 ============================================================
 선택창 관리
 ============================================================

 파일 이름은 기존 구조를 유지하기 위해 backgrounds.js를
 그대로 사용하지만, 이제 다음 네 모드를 모두 관리합니다.

 1. 배경
 2. 캐릭터
 3. 움직이는 배경 및 캐릭터
 4. AR

 현재 실제 카메라 합성은 기존 1차 기능인 '배경'만 수행합니다.
*/

export class BackgroundManager {

  constructor(
    listElement,
    overlayElement,
    titleElement = null
  ) {

    this.listElement =
      listElement;

    this.overlayElement =
      overlayElement;

    this.titleElement =
      titleElement;


    /*
      현재 선택 모드는 첫 번째 모드인 배경
    */
    this.currentModeId =
      CONFIG.selectionModes[0]?.id ||
      "background";


    /*
      모드별 선택 항목을 각각 기억합니다.

      다른 모드로 갔다가 다시 배경으로 돌아와도
      기존에 선택했던 배경이 유지됩니다.
    */
    this.selectedItems = {

      background:
        CONFIG.backgrounds[0] ||
        null,

      character:
        null,

      motion:
        null,

      ar:
        null

    };


    /*
      하단 선택 알림
    */
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
 현재 모드의 항목 배열 가져오기
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


    /*
      제목 변경

      예:
      배경을 선택해 주세요
      캐릭터를 선택해 주세요
      움직이는 배경 및 캐릭터를 선택해 주세요
      AR 효과를 선택해 주세요
    */
    if (this.titleElement) {

      this.titleElement.textContent =
        mode.title;

    }


    /*
      스크린리더용 선택창 이름도 변경
    */
    this.listElement.setAttribute(
      "aria-label",
      mode.ariaLabel
    );


    this.listElement.innerHTML =
      "";


    const items =
      this.getCurrentItems();


    /*
      아직 자료가 등록되지 않은 모드는
      빈 선택창 대신 안내 메시지를 표시합니다.
    */
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
         '없음' 항목
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
         썸네일 이미지

         실제 고해상도 원본 src가 아니라
         작은 thumbnail만 불러옵니다.
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
 자료가 없는 모드의 안내
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

    /*
      현재 모드의 선택 상태 저장
    */
    this.selectedItems[
      this.currentModeId
    ] =
      item;


    /*
      현재 선택창의 버튼 표시 초기화
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
     ============================================================
     현재 1차 실제 기능: 정적 배경
     ============================================================

     캐릭터 / 움직임 / AR은 선택창 구조만 준비되어 있고
     실제 레이어 합성은 각각의 개발 단계에서 연결합니다.
    */

    if (
      this.currentModeId ===
      "background"
    ) {

      this.applyBackground(
        item
      );

      return;

    }


    /*
      향후 기능 자료가 등록되었을 때의 공통 선택 알림
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

    /*
      배경 없음
    */
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


    /*
      고해상도 원본은 실제로 선택했을 때만 로딩됩니다.
    */
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


    /*
      같은 애니메이션을 연속 실행하기 위한 reflow
    */
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
 현재 선택된 배경
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
 향후 확장용: 모든 모드 선택값 반환
 ============================================================
 */

  getSelectedItems() {

    return {
      ...this.selectedItems
    };

  }

}
