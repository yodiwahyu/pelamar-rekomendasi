/**
 * Penghubung frontend -> API Google Apps Script.
 *
 * Catatan teknis:
 * - Permintaan dikirim sebagai POST dengan Content-Type "text/plain" (isinya JSON).
 *   Ini "simple request" sehingga browser tidak melakukan preflight CORS, yang
 *   tidak didukung oleh Apps Script.
 * - Apps Script membalas lewat redirect ke script.googleusercontent.com; fetch
 *   mengikutinya otomatis.
 * - Api.call() TIDAK pernah melempar error: selalu mengembalikan objek
 *   { success: true|false, ... }.
 */
(function () {
  var cfg = window.APP_CONFIG || {};
  var TIMEOUT_MS = 60000;

  function call(action, payload) {
    if (!cfg.API_URL || /GANTI-DENGAN/.test(cfg.API_URL)) {
      return Promise.resolve({ success: false, message: 'API_URL belum diisi di config.js.' });
    }
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);

    return fetch(cfg.API_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
      signal: ctrl.signal
    }).then(function (res) {
      return res.text();
    }).then(function (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        return {
          success: false,
          message: 'Respons server tidak valid. Pastikan Web App di-deploy dengan akses "Anyone", URL di config.js benar, dan sudah memakai versi terbaru.'
        };
      }
    }).catch(function (e) {
      return {
        success: false,
        message: (e && e.name === 'AbortError')
          ? 'Permintaan terlalu lama (timeout). Coba lagi.'
          : 'Gagal terhubung ke server. Periksa koneksi internet.'
      };
    }).then(function (result) {
      clearTimeout(timer);
      return result;
    });
  }

  window.Api = { call: call };

  // Terapkan logo dari config ke semua <img data-logo> dan favicon
  document.addEventListener('DOMContentLoaded', function () {
    if (!cfg.LOGO_URL) return;
    document.querySelectorAll('img[data-logo]').forEach(function (img) { img.src = cfg.LOGO_URL; });
    var link = document.querySelector('link[rel~="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = cfg.LOGO_URL;
  });
})();
