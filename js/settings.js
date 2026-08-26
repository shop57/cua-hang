/* ==========================================================================
   Settings dropdown: theme (sáng/tối) + lối tắt Quản trị
   ========================================================================== */
(function () {
  function getTheme() {
    try { return localStorage.getItem('theme') || 'light'; }
    catch (e) { return 'light'; }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var toggleBtn = document.getElementById('settingsToggle');
    var panel = document.getElementById('settingsPanel');
    var themeSwitch = document.getElementById('themeSwitch');

    if (themeSwitch) {
      var syncSwitch = function () {
        var isDark = getTheme() === 'dark';
        themeSwitch.setAttribute('aria-checked', String(isDark));
        themeSwitch.classList.toggle('is-on', isDark);
      };
      syncSwitch();
      themeSwitch.addEventListener('click', function () {
        var next = getTheme() === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem('theme', next); } catch (e) {}
        applyTheme(next);
        syncSwitch();
      });
    }

    if (!toggleBtn || !panel) return;

    var closePanel = function () {
      panel.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
    };
    var openPanel = function () {
      panel.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
    };

    toggleBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panel.hidden) openPanel(); else closePanel();
    });
    panel.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () {
      if (!panel.hidden) closePanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });
  });
})();
