import { CONFIG } from "./config.js";


/*
 ============================================================
 선택창 / 효과 관리자
 ============================================================

 - 배경 / 캐릭터 / 움직임 / AR은 서로 독립적입니다.
 - 실제 항목을 새로 선택하면 이전 모드 효과는 즉시 해제됩니다.
 - 각 모드의 '없음'을 누르면 카메라 영상만 남습니다.
*/

export class BackgroundManager {

  constructor(
    listElement,
    backgroundOverlayElement,
    titleElement = null,
    characterOverlayElement = null,
    animatedBackgroundOverlayElement = null,
    animatedCharacterOverlayElement = null,
    characterTitleOverlayElement = null,
    arTracker = null
  ) {

    this.listElement =
      listElement;

    this.backgroundOverlayElement =
      backgroundOverlayElement;

    this.titleElement =
      titleElement;

    this.characterOverlayElement =
      characterOverlayElement;

    this.animatedBackgroundOverlayElement =
      animatedBackgroundOverlayElement;

    this.animatedCharacterOverlayElement =
      animatedCharacterOverlayElement;

    this.characterTitleOverlayElement =
      characterTitleOverlayElement;

    this.arTracker =
      arTracker;

    this.currentModeId =
      CONFIG.selectionModes[0]?.id ||
      "background";

    this.activeModeId =
      null;

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


  /* ========================================================
     현재 선택창 모드 변경
     ======================================================== */

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


  getCurrentItems() {

    return this.getItemsForMode(
      this.currentModeId
    );

  }


  getNoneItem(modeId) {

    return (
      this.getItemsForMode(modeId)
        .find(
          item => item.id === "none"
        ) ||
      null
    );

  }


  /* ========================================================
     선택창 렌더링
     ======================================================== */

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

        /* '없음' */
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

        /* 저해상도 썸네일 */
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
          async () => {

            await this.select(
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


  /* ========================================================
     항목 선택
     ======================================================== */

  async select(
    item,
    selectedButton
  ) {

    const selectedModeId =
      this.currentModeId;

    /*
      다른 모드 효과는 모두 먼저 제거합니다.
    */
    this.clearAllSelectionsAndEffects();

    this.selectedItems[
      selectedModeId
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

    /* 없음 */
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

    this.activeModeId =
      selectedModeId;

    if (
      selectedModeId ===
      "background"
    ) {

      this.applyBackground(
        item
      );

      return;

    }

    if (
      selectedModeId ===
      "character"
    ) {

      this.applyCharacter(
        item
      );

      return;

    }

    if (
      selectedModeId ===
      "motion"
    ) {

      this.applyMotion(
        item
      );

      return;

    }

    if (
      selectedModeId ===
      "ar"
    ) {

      await this.applyAr(
        item
      );

    }

  }


  /* ========================================================
     모든 효과 해제
     ======================================================== */

  clearAllSelectionsAndEffects() {

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
    this.clearMotionOverlays();
    this.clearCharacterTitle();

    if (this.arTracker) {

      this.arTracker.clearEffect();

    }

  }


  clearBackgroundOverlay() {

    if (!this.backgroundOverlayElement) {
      return;
    }

    this.backgroundOverlayElement.removeAttribute(
      "src"
    );

    this.backgroundOverlayElement.style.display =
      "none";

  }


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


  clearMotionOverlays() {

    if (
      this.animatedBackgroundOverlayElement
    ) {

      this.animatedBackgroundOverlayElement.removeAttribute(
        "src"
      );

      this.animatedBackgroundOverlayElement.style.display =
        "none";

    }

    if (
      this.animatedCharacterOverlayElement
    ) {

      this.animatedCharacterOverlayElement.removeAttribute(
        "src"
      );

      this.animatedCharacterOverlayElement.style.display =
        "none";

    }

  }


  /* ========================================================
     캐릭터 전용 타이틀
     ======================================================== */

  showCharacterTitle() {

    if (!this.characterTitleOverlayElement) {
      return;
    }

    const title =
      CONFIG.characterTitle;

    if (
      !title ||
      !title.src
    ) {
      return;
    }

    this.characterTitleOverlayElement.style.setProperty(
      "--character-title-width",
      `${(title.widthRatio ?? 0.34) * 100}%`
    );

    this.characterTitleOverlayElement.style.setProperty(
      "--character-title-left",
      `${(title.leftRatio ?? 0.02) * 100}%`
    );

    this.characterTitleOverlayElement.style.setProperty(
      "--character-title-top",
      `${(title.topRatio ?? 0.02) * 100}%`
    );

    this.characterTitleOverlayElement.src =
      title.src;

    this.characterTitleOverlayElement.style.display =
      "block";

  }


  clearCharacterTitle() {

    if (!this.characterTitleOverlayElement) {
      return;
    }

    this.characterTitleOverlayElement.removeAttribute(
      "src"
    );

    this.characterTitleOverlayElement.style.display =
      "none";

  }


  /* ========================================================
     정적 배경
     ======================================================== */

  applyBackground(background) {

    if (
      !background ||
      !background.src
    ) {

      return;

    }

    this.backgroundOverlayElement.src =
      background.src;

    this.backgroundOverlayElement.style.display =
      "block";

    this.showToast(
      background.name
    );

  }


  /* ========================================================
     정적 캐릭터
     ======================================================== */

  applyCharacter(character) {

    if (
      !this.characterOverlayElement ||
      !character ||
      !character.src
    ) {

      return;

    }

    const placement =
      character.placement || {};

    this.characterOverlayElement.style.setProperty(
      "--character-width",
      `${(placement.widthRatio ?? 0.40) * 100}%`
    );

    this.characterOverlayElement.style.setProperty(
      "--character-right",
      `${(placement.rightRatio ?? 0.02) * 100}%`
    );

    this.characterOverlayElement.style.setProperty(
      "--character-bottom",
      `${(placement.bottomRatio ?? 0) * 100}%`
    );

    this.characterOverlayElement.src =
      character.src;

    this.characterOverlayElement.style.display =
      "block";

    /*
      title.png은 정적 캐릭터에서만 함께 표시됩니다.
    */
    this.showCharacterTitle();

    this.showToast(
      character.name
    );

  }


  /* ========================================================
     움직이는 배경 / 캐릭터
     ======================================================== */

  applyMotion(item) {

    if (
      !item ||
      !item.src
    ) {
      return;
    }

    /* 움직이는 전체 배경 */
    if (
      item.type ===
      "animated-background"
    ) {

      if (
        !this.animatedBackgroundOverlayElement
      ) {
        return;
      }

      this.animatedBackgroundOverlayElement.src =
        item.src;

      this.animatedBackgroundOverlayElement.style.display =
        "block";

      /*
        움직이는 배경에는 title.png을 표시하지 않습니다.
      */
      this.clearCharacterTitle();

      this.showToast(
        item.name
      );

      return;

    }

    /* 움직이는 캐릭터 */
    if (
      item.type ===
      "animated-character"
    ) {

      if (
        !this.animatedCharacterOverlayElement
      ) {
        return;
      }

      const placement =
        item.placement || {};

      this.animatedCharacterOverlayElement.style.setProperty(
        "--animated-character-width",
        `${(placement.widthRatio ?? 0.36) * 100}%`
      );

      this.animatedCharacterOverlayElement.style.setProperty(
        "--animated-character-right",
        `${(placement.rightRatio ?? 0.03) * 100}%`
      );

      this.animatedCharacterOverlayElement.style.setProperty(
        "--animated-character-bottom",
        `${(placement.bottomRatio ?? 0.02) * 100}%`
      );

      this.animatedCharacterOverlayElement.src =
        item.src;

      this.animatedCharacterOverlayElement.style.display =
        "block";

      /*
        움직이는 캐릭터에는 title.png을 표시합니다.
      */
      this.showCharacterTitle();

      this.showToast(
        item.name
      );

    }

  }


  /* ========================================================
     얼굴인식 AR
     ======================================================== */

  async applyAr(item) {

    if (
      !this.arTracker ||
      !item ||
      !item.src
    ) {
      return;
    }

    /*
      AR에는 title.png을 표시하지 않습니다.
    */
    this.clearCharacterTitle();

    this.showToast(
      item.name
    );

    try {

      await this.arTracker.setEffect(
        item
      );

    }
    catch (error) {

      console.error(
        "AR 초기화 오류:",
        error
      );

      this.arTracker.clearEffect();

      this.activeModeId =
        null;

      this.selectedItems.ar =
        this.getNoneItem("ar") ||
        null;

      this.render();

      this.showToast(
        "AR 기능을 불러오지 못했습니다."
      );

    }

  }


  /* ========================================================
     없음 알림
     ======================================================== */

  showNoneToast(modeId) {

    const messages = {
      background:
        "배경 없음",
      character:
        "캐릭터 없음",
      motion:
        "움직임 없음",
      ar:
        "AR 없음"
    };

    this.showToast(
      messages[modeId] ||
      "효과 없음"
    );

  }


  /* ========================================================
     하단 Toast
     ======================================================== */

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


  /* ========================================================
     현재 활성 상태 조회
     ======================================================== */

  getSelectedBackground() {

    if (
      this.activeModeId !==
      "background"
    ) {
      return null;
    }

    const item =
      this.selectedItems.background;

    return (
      item &&
      item.id !== "none" &&
      item.src
    )
      ? item
      : null;

  }


  getSelectedCharacter() {

    if (
      this.activeModeId !==
      "character"
    ) {
      return null;
    }

    const item =
      this.selectedItems.character;

    return (
      item &&
      item.id !== "none" &&
      item.src
    )
      ? item
      : null;

  }


  getSelectedMotion() {

    if (
      this.activeModeId !==
      "motion"
    ) {
      return null;
    }

    const item =
      this.selectedItems.motion;

    return (
      item &&
      item.id !== "none" &&
      item.src
    )
      ? item
      : null;

  }


  getSelectedAr() {

    if (
      this.activeModeId !==
      "ar"
    ) {
      return null;
    }

    const item =
      this.selectedItems.ar;

    return (
      item &&
      item.id !== "none" &&
      item.src
    )
      ? item
      : null;

  }


  getActiveModeId() {

    return this.activeModeId;

  }


  getSelectedItems() {

    return {
      ...this.selectedItems
    };

  }

}
