(function () {
  // ⚠️ IMPORTANT: Replace this with your own admin email address.
  // FormSubmit.co requires a one-time confirmation click on the FIRST
  // submission (check your inbox), after which it works automatically
  // forever. No signup, no dashboard, no API key needed.
  var ADMIN_FEEDBACK_EMAIL = 'YOUR_EMAIL_HERE@example.com';

  var MAX_TOTAL_BYTES = 10 * 1024 * 1024; // 10MB — FormSubmit's free-tier hard limit

  // ---------- Theme Mode (localStorage only — never touches server/admin) ----------
  var THEME_KEY = 'coloriconlab_theme';
  var themeToggleBtn = document.getElementById('themeToggleBtn');
  var themeToggleIcon = document.getElementById('themeToggleIcon');

  function applyThemeIcon() {
    var isLight = document.documentElement.getAttribute('data-theme') === 'light';
    // Rule: moon shown in light mode (tap to go dark), sun shown in dark mode (tap to go light)
    themeToggleIcon.textContent = isLight ? '🌙' : '☀️';
  }

  if (themeToggleBtn) {
    applyThemeIcon();
    themeToggleBtn.addEventListener('click', function () {
      var isLight = document.documentElement.getAttribute('data-theme') === 'light';
      if (isLight) {
        document.documentElement.removeAttribute('data-theme');
        try { localStorage.setItem(THEME_KEY, 'dark'); } catch (e) {}
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        try { localStorage.setItem(THEME_KEY, 'light'); } catch (e) {}
      }
      applyThemeIcon();
    });
  }

  // ---------- Burger menu ----------
  var burgerBtn = document.getElementById('burgerBtn');
  var burgerMenu = document.getElementById('burgerMenu');
  var openFeedbackBtn = document.getElementById('openFeedbackBtn');

  if (burgerBtn) {
    burgerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      burgerMenu.style.display = burgerMenu.style.display === 'block' ? 'none' : 'block';
    });
    document.addEventListener('click', function (e) {
      if (!burgerMenu.contains(e.target) && e.target !== burgerBtn) {
        burgerMenu.style.display = 'none';
      }
    });
  }

  // ---------- Feedback modal ----------
  var feedbackOverlay = document.getElementById('feedbackOverlay');
  var feedbackForm = document.getElementById('feedbackForm');
  var fbMessage = document.getElementById('fbMessage');
  var fbCharCount = document.getElementById('fbCharCount');
  var fbFiles = document.getElementById('fbFiles');
  var fbFileSize = document.getElementById('fbFileSize');
  var fbSubmitBtn = document.getElementById('fbSubmitBtn');
  var feedbackMsg = document.getElementById('feedbackMsg');

  function openFeedback() {
    burgerMenu.style.display = 'none';
    feedbackOverlay.classList.add('open');
  }
  function closeFeedback() {
    feedbackOverlay.classList.remove('open');
  }

  if (openFeedbackBtn) openFeedbackBtn.addEventListener('click', openFeedback);
  var feedbackCloseBtn = document.getElementById('feedbackClose');
  if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', closeFeedback);
  feedbackOverlay.addEventListener('click', function (e) {
    if (e.target === feedbackOverlay) closeFeedback();
  });

  fbMessage.addEventListener('input', function () {
    fbCharCount.textContent = fbMessage.value.length;
  });

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function getTotalFileSize() {
    var total = 0;
    for (var i = 0; i < fbFiles.files.length; i++) total += fbFiles.files[i].size;
    return total;
  }

  fbFiles.addEventListener('change', function () {
    var total = getTotalFileSize();
    fbFileSize.textContent = formatSize(total);
    fbFileSize.style.color = total > MAX_TOTAL_BYTES ? '#f87171' : 'var(--muted)';
  });

  feedbackForm.addEventListener('submit', function (e) {
    e.preventDefault();
    feedbackMsg.className = 'msg';

    var totalSize = getTotalFileSize();
    if (totalSize > MAX_TOTAL_BYTES) {
      feedbackMsg.className = 'msg error';
      feedbackMsg.textContent =
        'Attachments are too large (' + formatSize(totalSize) + '). Please keep the total under 10MB.';
      return;
    }

    var message = document.getElementById('fbMessage').value.trim();
    var email = document.getElementById('fbEmail').value.trim();
    if (!message && fbFiles.files.length === 0) {
      feedbackMsg.className = 'msg error';
      feedbackMsg.textContent = 'Please write a message or attach a file.';
      return;
    }

    var formData = new FormData();
    formData.append('message', message || '(no message, see attachment)');
    formData.append('email', email || '(not provided)');
    formData.append('_subject', 'New feedback — ColorIconLab');
    formData.append('_captcha', 'false');
    formData.append('_template', 'box');
    for (var i = 0; i < fbFiles.files.length; i++) {
      formData.append('attachment' + i, fbFiles.files[i]);
    }

    fbSubmitBtn.disabled = true;
    fbSubmitBtn.textContent = 'Sending...';

    fetch('https://formsubmit.co/ajax/' + encodeURIComponent(ADMIN_FEEDBACK_EMAIL), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to send feedback. Please try again.');
        return res.json();
      })
      .then(function () {
        feedbackMsg.className = 'msg success';
        feedbackMsg.textContent = 'Thank you! Your feedback has been sent.';
        feedbackForm.reset();
        fbCharCount.textContent = '0';
        fbFileSize.textContent = '0 KB';
        setTimeout(closeFeedback, 1800);
      })
      .catch(function (err) {
        feedbackMsg.className = 'msg error';
        feedbackMsg.textContent = err.message;
      })
      .finally(function () {
        fbSubmitBtn.disabled = false;
        fbSubmitBtn.textContent = 'Send Feedback';
      });
  });
})();
