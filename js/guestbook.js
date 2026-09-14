/* ============================================================
   Google Apps Script 사진 방명록 업로더
   ------------------------------------------------------------
   - CORS 문제를 피하기 위해 실제 파일 전송은 숨은 form + iframe 사용
   - 업로드 결과 확인은 Google Apps Script JSONP status API 사용
   ============================================================ */

export class GuestbookUploader {

  constructor(config = {}) {
    this.config = config || {};
    this.iframe = null;
    this.iframeName = `guestbookUploadFrame_${Math.random().toString(36).slice(2)}`;
  }


  isConfigured() {
    const url = String(this.config.webAppUrl || '').trim();
    const key = String(this.config.eventKey || '').trim();

    return Boolean(
      this.config.enabled !== false &&
      /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec(?:\?.*)?$/i.test(url) &&
      key &&
      !key.includes('PASTE_')
    );
  }


  getMaxMessageLength() {
    return Number(this.config.maxMessageLength) || 60;
  }


  async upload(blob, mediaType, message = '') {
    if (!this.isConfigured()) {
      throw new Error('GUESTBOOK_NOT_CONFIGURED');
    }

    if (!(blob instanceof Blob)) {
      throw new Error('UPLOAD_BLOB_MISSING');
    }

    const maxBytes = Number(this.config.maxUploadBytes) || (6 * 1024 * 1024);
    if (blob.size > maxBytes) {
      const error = new Error('UPLOAD_TOO_LARGE');
      error.maxBytes = maxBytes;
      throw error;
    }

    const safeMediaType = mediaType === 'gif' ? 'gif' : 'png';
    const expectedMime = safeMediaType === 'gif' ? 'image/gif' : 'image/png';
    const normalizedBlob = blob.type === expectedMime
      ? blob
      : blob.slice(0, blob.size, expectedMime);

    const submissionId = this.createId();
    const clientId = this.getClientId();
    const payload = await this.blobToDataUrl(normalizedBlob);

    this.ensureIframe();

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = this.config.webAppUrl;
    form.target = this.iframeName;
    form.acceptCharset = 'UTF-8';
    form.style.display = 'none';

    const fields = {
      action: 'upload',
      eventKey: this.config.eventKey,
      submissionId,
      clientId,
      mediaType: safeMediaType,
      mimeType: expectedMime,
      message: String(message || '').slice(0, this.getMaxMessageLength()),
      payload
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();

    window.setTimeout(() => {
      form.remove();
    }, 1500);

    return this.waitForStatus(submissionId);
  }


  ensureIframe() {
    if (this.iframe && document.body.contains(this.iframe)) {
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.name = this.iframeName;
    iframe.title = '방명록 업로드 처리';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.position = 'fixed';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    iframe.style.left = '-9999px';

    document.body.appendChild(iframe);
    this.iframe = iframe;
  }


  async waitForStatus(submissionId) {
    const interval = Number(this.config.statusPollIntervalMs) || 700;
    const timeout = Number(this.config.statusTimeoutMs) || 25000;
    const startedAt = Date.now();

    await this.delay(Math.min(interval, 900));

    while (Date.now() - startedAt < timeout) {
      try {
        const status = await this.jsonp({
          action: 'status',
          submissionId
        });

        if (status && status.found) {
          if (status.status === 'error' || status.ok === false) {
            const error = new Error(status.error || 'GUESTBOOK_UPLOAD_FAILED');
            error.code = 'GUESTBOOK_UPLOAD_FAILED';
            throw error;
          }

          if (status.status === 'published' || status.sequence) {
            return {
              success: true,
              sequence: Number(status.sequence) || 0,
              submissionId
            };
          }
        }
      }
      catch (error) {
        if (error && error.code === 'GUESTBOOK_UPLOAD_FAILED') {
          throw error;
        }
        // 일시적인 JSONP 네트워크 오류는 제한 시간까지 다시 확인합니다.
      }

      await this.delay(interval);
    }

    throw new Error('GUESTBOOK_STATUS_TIMEOUT');
  }


  jsonp(params) {
    return new Promise((resolve, reject) => {
      const callbackName = `__guestbookCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('JSONP_TIMEOUT'));
      }, 7000);

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        try {
          delete window[callbackName];
        }
        catch (_) {
          window[callbackName] = undefined;
        }
        script.remove();
      };

      window[callbackName] = data => {
        cleanup();
        resolve(data);
      };

      const url = new URL(this.config.webAppUrl);
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
      url.searchParams.set('callback', callbackName);
      url.searchParams.set('_', String(Date.now()));

      script.src = url.toString();
      script.async = true;
      script.onerror = () => {
        cleanup();
        reject(new Error('JSONP_NETWORK_ERROR'));
      };

      document.head.appendChild(script);
    });
  }


  blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('FILE_READ_FAILED'));
      reader.readAsDataURL(blob);
    });
  }


  createId() {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }

    return `gb-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
  }


  getClientId() {
    const key = 'site20photo_guestbook_client_id';

    try {
      let value = localStorage.getItem(key);
      if (!value) {
        value = this.createId();
        localStorage.setItem(key, value);
      }
      return value;
    }
    catch (_) {
      return this.createId();
    }
  }


  delay(ms) {
    return new Promise(resolve => window.setTimeout(resolve, ms));
  }
}
