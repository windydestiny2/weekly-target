// frontend/log_progress.js

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = "http://localhost:5001/api";
  const USER_ID = localStorage.getItem('user_id');
  const form = document.getElementById('logForm');
  const noteEl = document.getElementById('logNote');
  const statusEl = document.getElementById('statusMessage');
  const btn = document.getElementById('logBtn');

  if (!USER_ID) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.6';
    }
    if (statusEl) statusEl.textContent = 'Mengirim...';

    const today = new Date().toISOString().split('T')[0];
    const payload = {
      user_id: USER_ID,
      log_date: today,
      notes: noteEl ? noteEl.value.trim() : ''
    };

    try {
      const res = await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        // tandai ke dashboard: hanya perlu tanggal ISO
        try {
          localStorage.setItem('just_logged', today);
          localStorage.setItem('checked_in_today', today);
          // update cached actual array (Senin..Minggu)
          try {
            const daysOrder = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
            const saved = JSON.parse(localStorage.getItem('local_actual') || 'null') || Array(7).fill(0);
            const todayIdx = (new Date().getDay() + 6) % 7; // map JS 0..6 -> Senin..Minggu idx
            saved[todayIdx] = 1;
            localStorage.setItem('local_actual', JSON.stringify(saved));
          } catch (e) { /* ignore */ }
        } catch (e) { /* ignore storage errors */ }
        if (statusEl) statusEl.textContent = 'Sukses: progres tercatat. Mengalihkan ke dasbor...';
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 600);
      } else {
        if (statusEl) statusEl.textContent = json.message || 'Gagal mencatat progres';
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      }
    } catch (err) {
      console.error(err);
      if (statusEl) statusEl.textContent = 'Koneksi gagal. Coba lagi.';
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  });
});