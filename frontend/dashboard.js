/**
 * Helper function untuk mengubah tanggal (mis. "2025-11-12") menjadi nama hari (mis. "Rabu")
 */
function getDayNameFromDate(dateString) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  
  // Tambahkan 'T00:00:00' untuk memastikan zona waktu lokal yang benar
  const date = new Date(dateString + 'T00:00:00'); 
  return days[date.getDay()];
}

/**
 * Fungsi utama yang langsung dijalankan
 */
(async () => {
  const API_BASE = "http://localhost:5001/api";
  // Get user_id from localStorage or session
  const USER_ID = localStorage.getItem('user_id');
  if (!USER_ID) {
    alert('Please login first');
    window.location.href = 'login.html';
    return;
  }
  const progressTextEl = document.getElementById("progressText");

  try {
    // -----------------------------------------------------------------
    // LANGKAH 1: Mengambil data dari Backend API (Bukan localStorage)
    // -----------------------------------------------------------------
    const res = await fetch(`${API_BASE}/dashboard/weekly?user_id=${USER_ID}`);
    if (!res.ok) {
      throw new Error('Gagal mengambil data dari server');
    }
    
    const result = await res.json();
    if (!result.success) {
      throw new Error(result.message || 'Gagal memuat data');
    }

    const data = result.data; // Ini data dari API: { target: 2, actual: 0, targetDetails: ..., actualDetails: ... }

    // -----------------------------------------------------------------
    // LANGKAH 2: Memproses Data API agar Sesuai Chart Harian Anda
    // -----------------------------------------------------------------
    const daysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
    const targetData = []; // Array untuk chart (berisi 0 atau 1)
    const actualData = []; // Array untuk chart (berisi 0 atau 1)

    // 1. Proses Data Target (dari Poin 1)
    // Ambil data hari target, misal: ["Senin", "Rabu"]
    const targetDays = data.targetDetails ? data.targetDetails.days : [];

    // 2. Proses Data Aktual (dari Poin 2)
    // Ambil data log, misal: [{ log_date: "2025-11-10" }]
    const actualLogs = data.actualDetails; 
    // Ubah tanggal log menjadi nama hari, misal: ["Senin"]
    const actualDayNames = actualLogs.map(log => getDayNameFromDate(log.log_date));

    // 3. Buat array data untuk chart
    daysOfWeek.forEach((day) => {
      // Cek apakah hari ini adalah hari target? (1 = ya, 0 = tidak)
      const isTarget = targetDays.includes(day) ? 1 : 0;
      targetData.push(isTarget);

      // Cek apakah hari ini sudah dikerjakan? (1 = ya, 0 = tidak)
      const isActual = actualDayNames.includes(day) ? 1 : 0;
      actualData.push(isActual);
    });

    // -----------------------------------------------------------------
    // LANGKAH 3: Render Teks Progres & Chart (Kode styling Anda)
    // -----------------------------------------------------------------

    // Update progress text
    const totalCompleted = actualData.reduce((a, b) => a + b, 0); // Hitung total '1' di array aktual
    const totalTarget = targetData.reduce((a, b) => a + b, 0);   // Hitung total '1' di array target
    
    progressTextEl.innerHTML = `
        <strong>Anda telah menyelesaikan ${totalCompleted} dari ${totalTarget} target belajar minggu ini.</strong>
    `;

    // Buat chart 
    const ctx = document.getElementById("weeklyProgressChart").getContext("2d");
    const weeklyProgressChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: daysOfWeek,
        datasets: [
          {
            label: "Target Selesai (Actual)",
            data: actualData, // Data dari API
            backgroundColor: "#00ff88",
            borderColor: "#00cc66",
            borderWidth: 3,
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: "Total Target",
            data: targetData, // Data dari API
            backgroundColor: "#e0e0e0",
            borderColor: "#999999",
            borderWidth: 3,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true, // Pastikan ini 'true' atau hapus
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: {
                family: "'Poppins', sans-serif",
                size: 14,
                weight: "bold",
              },
              color: "#333",
              padding: 16,
              usePointStyle: true,
              pointStyle: "rect",
            },
          },
          title: {
            display: true,
            text: `Target vs Aktual (${data.range.start} s/d ${data.range.end})`, 
            font: {
              family: "'Poppins', sans-serif",
              size: 16,
              weight: "bold",
            },
            color: "#667eea",
            padding: {
              top: 16,
              bottom: 16,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            // Karena data kita hanya 0 atau 1, set max ke 1.
            max: 1, 
            ticks: {
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
                weight: "bold",
              },
              color: "#555",
              stepSize: 1, // Tampilkan 0 dan 1
            },
            grid: {
              color: "rgba(102, 126, 234, 0.1)",
              lineWidth: 2,
              drawBorder: true,
              borderColor: "#667eea",
            },
          },
          x: {
            ticks: {
              font: {
                family: "'Poppins', sans-serif",
                size: 12,
                weight: "bold",
              },
              color: "#333",
            },
            grid: {
              color: "rgba(102, 126, 234, 0.05)",
              lineWidth: 1,
              drawBorder: true,
              borderColor: "#667eea",
            },
          },
        },
      },
    });

  } catch (err) {
    // Tangani error jika API gagal
    console.error(err);
    progressTextEl.textContent = "Gagal memuat data dari API. Periksa konsol.";
  }
})();

// Check-in functionality
document.getElementById('checkInBtn').addEventListener('click', async () => {
  const today = new Date().toISOString().split('T')[0];
  const statusEl = document.getElementById('checkInStatus');

  try {
    const response = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: USER_ID, log_date: today, notes: 'Checked in' })
    });

    const data = await response.json();
    if (data.success) {
      statusEl.textContent = 'Check-in successful!';
      location.reload(); // Reload to update chart
    } else {
      statusEl.textContent = data.message || 'Check-in failed';
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Connection error';
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
});
