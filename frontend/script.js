// frontend/script.js
const API_BASE = "http://localhost:5001/api";
const USER_ID = localStorage.getItem('user_id');
if (!USER_ID) {
  alert('Please login first');
  window.location.href = 'login.html';
}

const form = document.getElementById("scheduleForm");
const statusDiv = document.getElementById("status");
const noteField = document.getElementById("note");
let currentTargetId = null; // untuk update data nanti

// 🔹 Fungsi: Ambil data dari API
async function loadExistingSchedule() {
  try {
    const res = await fetch(`${API_BASE}/targets?user_id=${USER_ID}`);
    const data = await res.json();

    if (data.success && data.data.length > 0) {
      const target = data.data[0];
      currentTargetId = target.id;

      // centang checkbox sesuai data
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = target.days.includes(cb.value);
      });

      noteField.value = target.note || "";
      statusDiv.textContent = "Jadwal lama dimuat ✅";
    } else {
      statusDiv.textContent = "Belum ada jadwal tersimpan.";
    }
  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Gagal memuat data.";
  }
}

// 🔹 Fungsi: Simpan atau update jadwal
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedDays = [...document.querySelectorAll('input[type="checkbox"]:checked')].map(cb => cb.value);
  const note = noteField.value.trim();

  if (selectedDays.length === 0) {
    alert("Pilih minimal satu hari belajar!");
    return;
  }

  const payload = {
    user_id: USER_ID,
    days: selectedDays,
    note: note
  };

  try {
    let response;

    if (currentTargetId) {

      const putPayload = { days: selectedDays, note: note };
      response = await fetch(`${API_BASE}/targets/${currentTargetId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(putPayload)
      });
    } else {
      // create new target
      response = await fetch(`${API_BASE}/targets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    }

    const data = await response.json();

    if (data.success) {
      statusDiv.textContent = "✅ Jadwal berhasil disimpan!";
      currentTargetId = data.data.id || currentTargetId;
    } else {
      statusDiv.textContent = "⚠️ Gagal menyimpan jadwal.";
    }

  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Terjadi kesalahan koneksi.";
  }
});

// 🔹 Jalankan saat halaman dibuka
loadExistingSchedule();
