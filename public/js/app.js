// Momentum Journal - Client-side JavaScript

document.addEventListener('DOMContentLoaded', function() {

  // ==========================================
  // Search filtering (client-side)
  // ==========================================
  const searchInputs = document.querySelectorAll('[data-search-target]');
  searchInputs.forEach(function(input) {
    input.addEventListener('input', function() {
      const target = document.querySelector(input.dataset.searchTarget);
      if (!target) return;
      const query = input.value.toLowerCase();
      const rows = target.querySelectorAll('tr, .citizen-card');
      rows.forEach(function(row) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  });

  // ==========================================
  // Tab switching
  // ==========================================
  document.querySelectorAll('.content-tab[data-tab]').forEach(function(tab) {
    tab.addEventListener('click', function(e) {
      e.preventDefault();
      var group = tab.closest('.tab-group');
      if (!group) return;
      group.querySelectorAll('.content-tab').forEach(function(t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var panels = group.parentElement.querySelectorAll('.tab-panel');
      panels.forEach(function(p) { p.style.display = 'none'; });
      var target = document.getElementById(tab.dataset.tab);
      if (target) target.style.display = 'block';
    });
  });

  // ==========================================
  // Confirm dialogs
  // ==========================================
  document.querySelectorAll('[data-confirm]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (!confirm(el.dataset.confirm)) {
        e.preventDefault();
      }
    });
  });

  // ==========================================
  // Modal close on backdrop click
  // ==========================================
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  });

  // ==========================================
  // Date picker helpers
  // ==========================================
  // Set default dates on date inputs if empty
  document.querySelectorAll('input[type="date"][data-default-today]').forEach(function(input) {
    if (!input.value) {
      input.value = new Date().toISOString().split('T')[0];
    }
  });

  // ==========================================
  // Form validation
  // ==========================================
  document.querySelectorAll('form[data-validate]').forEach(function(form) {
    form.addEventListener('submit', function(e) {
      var valid = true;
      form.querySelectorAll('[required]').forEach(function(field) {
        if (!field.value.trim()) {
          field.style.borderColor = '#e74c3c';
          valid = false;
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) {
        e.preventDefault();
        alert('Please fill in all required fields.');
      }
    });
  });

  // ==========================================
  // Auto-hide alerts after 5 seconds
  // ==========================================
  document.querySelectorAll('.alert').forEach(function(alert) {
    setTimeout(function() {
      alert.style.transition = 'opacity 0.3s';
      alert.style.opacity = '0';
      setTimeout(function() { alert.remove(); }, 300);
    }, 5000);
  });

  // ==========================================
  // Calendar navigation
  // ==========================================
  var calendarDateInput = document.getElementById('calendar-date-picker');
  if (calendarDateInput) {
    calendarDateInput.addEventListener('change', function() {
      var bp = document.body.getAttribute('data-base-path') || '/journal';
      window.location.href = bp + '/calendar?date=' + this.value;
    });
  }

  // ==========================================
  // Keyboard shortcuts
  // ==========================================
  document.addEventListener('keydown', function(e) {
    // Escape closes modals
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal').forEach(function(modal) {
        modal.style.display = 'none';
      });
    }
  });

});
