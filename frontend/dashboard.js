function getDayNameFromDate(dateString) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Tambahkan 'T00:00:00' untuk memastikan zona waktu lokal yang benar
  const date = new Date(dateString + 'T00:00:00');
  return days[date.getDay()];
}

// Tambahkan global state untuk chart sehingga dapat diperbarui setelah check-in
window.weeklyProgressChart = null;
window.globalTargetData = [];
window.globalActualData = [];
window.globalDaysOfWeek = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

// Global constants
const API_BASE = "http://localhost:5001/api";
const USER_ID = localStorage.getItem('user_id');
if (!USER_ID) {
  alert('Please login first');
  window.location.href = 'login.html';
}

// --- GANTI / TAMBAHKAN helper normalisasi & parser yang lebih robust ---
function normalizeDayName(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().toLowerCase();
  const engMap = {
    mon: 'Senin', monday: 'Senin',
    tue: 'Selasa', tues: 'Selasa', tuesday: 'Selasa',
    wed: 'Rabu', wednesday: 'Rabu',
    thu: 'Kamis', thur: 'Kamis', thursday: 'Kamis',
    fri: 'Jumat', friday: 'Jumat',
    sat: 'Sabtu', saturday: 'Sabtu',
    sun: 'Minggu', sunday: 'Minggu'
  };
  // angka tunggal
  if (/^[0-6]$/.test(s)) {
    const arr = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    return arr[Number(s)];
  }
  if (/^[1-7]$/.test(s)) {
    const arr1 = [null,'Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
    return arr1[Number(s)] || null;
  }
  const indo = {
    'minggu':'Minggu','senin':'Senin','selasa':'Selasa','rabu':'Rabu',
    'kamis':'Kamis','jumat':'Jumat','jumat.':'Jumat','sabtu':'Sabtu'
  };
  if (indo[s]) return indo[s];
  if (engMap[s]) return engMap[s];
  // fallback: capitalize first letter
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * parseTargetDays(raw, daysOrder)
 * - daysOrder expected ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"]
 * - accepts:
 *   - array names ["Senin","Rabu"]
 *   - array booleans/0-1 length 7
 *   - array numbers [2] (0..6 JS getDay OR 1..7 with 1=Senin)
 *   - object map {"Senin":1, "Selasa":0}
 *   - string JSON or comma-separated
 */
function parseTargetDays(raw, daysOrder) {
  const out = Array(daysOrder.length).fill(0);
  if (!raw && raw !== 0) return out;

  // string -> try JSON or csv
  if (typeof raw === 'string') {
    const s = raw.trim();
    try {
      const parsed = JSON.parse(s);
      return parseTargetDays(parsed, daysOrder);
    } catch (e) {
      const parts = s.split(/[,;|]/).map(p => p.trim()).filter(Boolean);
      return parseTargetDays(parts, daysOrder);
    }
  }

  // array handling
  if (Array.isArray(raw)) {
    // case: boolean/0-1 flags length 7
    if (raw.length === daysOrder.length && raw.every(v => v === 0 || v === 1 || v === true || v === false)) {
      return raw.map(v => v ? 1 : 0);
    }

    // case: array of numbers (could be 0..6 JS or 1..7 Mon..Sun)
    if (raw.every(v => typeof v === 'number' || (/^\d+$/.test(String(v))))) {
      const nums = raw.map(Number);
      const all01 = nums.every(n => n === 0 || n === 1);
      if (all01 && nums.length === daysOrder.length) {
        return nums.map(n => n ? 1 : 0);
      }
      // detect format
      const all0to6 = nums.every(n => n >= 0 && n <= 6);
      const all1to7 = nums.every(n => n >= 1 && n <= 7);
      nums.forEach(n => {
        let idx = -1;
        if (all0to6) {
          // JS getDay mapping 0=Sun -> daysOrder index 6
          idx = (n + 6) % 7;
        } else if (all1to7) {
          // 1->Senin (index 0)
          idx = n - 1;
        } else {
          return;
        }
        if (idx >= 0 && idx < daysOrder.length) out[idx] = 1;
      });
      return out;
    }

    // case: array of names
    raw.forEach(item => {
      const name = normalizeDayName(item);
      const idx = daysOrder.indexOf(name);
      if (idx !== -1) out[idx] = 1;
    });
    return out;
  }

  // object map: keys may be names or numbers
  if (typeof raw === 'object') {
    Object.keys(raw).forEach(k => {
      const val = raw[k];
      // if key numeric
      if (/^\d+$/.test(String(k))) {
        const n = Number(k);
        let idx = -1;
        if (n >= 0 && n <= 6) idx = (n + 6) % 7;
        else if (n >= 1 && n <= 7) idx = n - 1;
        if (idx >= 0 && idx < daysOrder.length) out[idx] = (val ? 1 : 0);
      } else {
        const name = normalizeDayName(k);
        const idx = daysOrder.indexOf(name);
        if (idx !== -1) out[idx] = (raw[k] ? 1 : 0);
      }
    });
    return out;
  }

  // fallback single value (name or number)
  return parseTargetDays([raw], daysOrder);
}

// IIFE untuk mengambil dan memproses data dari API
(async () => {
  const progressTextEl = document.getElementById("progressText");
  // helper: render or update chart dari data yang diberikan
  function renderWeeklyChart(daysOfWeek, actualData, targetData, titleText) {
    try {
      const ctxEl = document.getElementById("weeklyProgressChart");
      if (!ctxEl) return;
      const ctx = ctxEl.getContext("2d");
      const dataObj = {
        labels: daysOfWeek,
        datasets: [
          {
            label: "Target Selesai (Actual)",
            data: actualData,
            backgroundColor: "#00ff88",
            borderColor: "#00cc66",
            borderWidth: 3,
            borderRadius: 8,
            borderSkipped: false,
          },
          {
            label: "Total Target",
            data: targetData,
            backgroundColor: "#e0e0e0",
            borderColor: "#999999",
            borderWidth: 3,
            borderRadius: 8,
            borderSkipped: false,
          },
        ],
      };

      const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: { display: true, position: "top" },
          title: { display: !!titleText, text: titleText || '' },
        },
        scales: { y: { beginAtZero: true, max: 1 } }
      };

      if (window.weeklyProgressChart) {
        window.weeklyProgressChart.data = dataObj;
        window.weeklyProgressChart.options = options;
        window.weeklyProgressChart.update();
      } else {
        window.weeklyProgressChart = new Chart(ctx, { type: "bar", data: dataObj, options });
      }
    } catch (e) {
      console.warn('renderWeeklyChart failed', e);
    }
  }

  // Jika ada cache langsung render supaya UX tidak reset saat pindah halaman
  try {
    const cachedTarget = (() => { try { return JSON.parse(localStorage.getItem('local_target') || 'null'); } catch(e){ return null; } })();
    const cachedActual = (() => { try { return JSON.parse(localStorage.getItem('local_actual') || 'null'); } catch(e){ return null; } })();
    const cachedDays = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
    if (Array.isArray(cachedTarget) && Array.isArray(cachedActual) && cachedTarget.length === 7 && cachedActual.length === 7) {
      // set globals so other code sees them
      window.globalTargetData = cachedTarget;
      window.globalActualData = cachedActual;
      window.globalDaysOfWeek = cachedDays;
      renderWeeklyChart(cachedDays, cachedActual, cachedTarget, 'Target vs Aktual (cached)');
      // initial progress text from cache
      if (progressTextEl) {
        const totalCompleted = cachedActual.reduce((a,b)=>a+b,0);
        const totalTarget = cachedTarget.reduce((a,b)=>a+b,0);
        progressTextEl.innerHTML = `<strong>Anda telah menyelesaikan ${totalCompleted} dari ${totalTarget} target belajar minggu ini.</strong>`;
      }
    }
  } catch (e) { /* ignore cache read errors */ }

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
    // Ambil raw target days dari API
    const targetRaw = data.targetDetails ? data.targetDetails.days : [];

    // parse menjadi boolean array sesuai daysOfWeek
    const parsedTargetBool = parseTargetDays(targetRaw, daysOfWeek);

    const targetData = [];
    const actualData = [];
    const actualLogs = data.actualDetails || [];
    const actualDayNames = actualLogs.map(log => getDayNameFromDate(log.log_date));

    // baca cache lokal bila ada (digunakan untuk segera menampilkan actual)
    const cachedActual = (() => { try { return JSON.parse(localStorage.getItem('local_actual') || 'null'); } catch(e){ return null; } })();

    daysOfWeek.forEach((day, idx) => {
      targetData.push(parsedTargetBool[idx] ? 1 : 0);
      const serverVal = actualDayNames.includes(day) ? 1 : 0;
      const cachedVal = Array.isArray(cachedActual) && cachedActual.length === daysOfWeek.length ? (cachedActual[idx] ? 1 : 0) : 0;
      // prefer cached actual for immediate UX (but keep server if cache not set)
      actualData.push(serverVal || cachedVal ? 1 : 0);
    });

    // Simpan ke global agar handler check-in dapat mengupdate tanpa reload
    window.globalTargetData = targetData;
    window.globalActualData = actualData;
    window.globalDaysOfWeek = daysOfWeek;

    // simpan merged hasil ke cache agar tidak "reset" setelah navigation
    try {
      localStorage.setItem('local_target', JSON.stringify(window.globalTargetData));
      localStorage.setItem('local_actual', JSON.stringify(window.globalActualData));
    } catch (e) { /* ignore */ }

    // Jika user baru saja melakukan log di halaman log_progress, tandai ke chart
    try {
      const justLogged = localStorage.getItem('just_logged'); // ISO date string 'YYYY-MM-DD'
      if (justLogged) {
        const todayISO = new Date().toISOString().split('T')[0];
        if (justLogged === todayISO) {
          // hitung index hari ini pada daysOfWeek (0=Senin)
          const todayIdx = (new Date().getDay() + 6) % 7;
          const targetForToday = window.globalTargetData && window.globalTargetData[todayIdx] === 1;
          if (targetForToday && window.globalActualData && window.globalActualData[todayIdx] !== 1) {
            window.globalActualData[todayIdx] = 1;
            // update cache also
            try {
              const saved = JSON.parse(localStorage.getItem('local_actual') || 'null') || Array(7).fill(0);
              saved[todayIdx] = 1;
              localStorage.setItem('local_actual', JSON.stringify(saved));
              localStorage.setItem('checked_in_today', todayISO);
            } catch(e){}
            if (window.weeklyProgressChart) {
              window.weeklyProgressChart.data.datasets[0].data = window.globalActualData;
              window.weeklyProgressChart.update();
            }
            // update progress text jika ada
            if (progressTextEl) {
              const totalCompleted = window.globalActualData.reduce((a, b) => a + b, 0);
              const totalTarget = window.globalTargetData.reduce((a, b) => a + b, 0);
              progressTextEl.innerHTML = `<strong>Anda telah menyelesaikan ${totalCompleted} dari ${totalTarget} target belajar minggu ini.</strong>`;
            }
          }
        }
        localStorage.removeItem('just_logged');
      }
    } catch (e) {
      console.warn('apply just_logged failed', e);
    }

    // -----------------------------------------------------------------
    // LANGKAH 3: Render Teks Progres & Chart (Kode styling Anda)
    // -----------------------------------------------------------------

    // Update progress text awal
    function updateProgressText() {
      const totalCompleted = window.globalActualData.reduce((a, b) => a + b, 0);
      const totalTarget = window.globalTargetData.reduce((a, b) => a + b, 0);
      if (progressTextEl) progressTextEl.innerHTML = `<strong>Anda telah menyelesaikan ${totalCompleted} dari ${totalTarget} target belajar minggu ini.</strong>`;
    }
    updateProgressText();

    // render chart (gunakan helper sehingga bisa diupdate lagi)
    renderWeeklyChart(daysOfWeek, window.globalActualData, window.globalTargetData, `Target vs Aktual (${data.range.start} s/d ${data.range.end})`);

  } catch (err) {
    // Tangani error jika API gagal
    console.error(err);
    if (progressTextEl) progressTextEl.textContent = "Gagal memuat data dari API. Periksa konsol.";
  }
})();

// Check-in functionality
// ...existing code...

// Hapus pendaftaran event listener dan pemanggilan checkStudyDay langsung.
// Ganti dengan pendaftaran yang aman saat DOM siap.
document.addEventListener('DOMContentLoaded', () => {
	// Cari elemen sekali setelah DOM siap
	const checkInBtnEl = document.getElementById('checkInBtn');
	const statusEl = document.getElementById('checkInStatus');

	if (checkInBtnEl) {
		checkInBtnEl.addEventListener('click', async () => {
			const today = new Date().toISOString().split('T')[0];

			try {
				const response = await fetch(`${API_BASE}/logs`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ user_id: USER_ID, log_date: today, notes: 'Checked in' })
				});

				const data = await response.json();
				if (data.success) {
					if (statusEl) {
						statusEl.textContent = 'You have checked in today!';
					}
					// Disable tombol secara lokal
					checkInBtnEl.disabled = true;
					checkInBtnEl.style.background = '#cccccc';
					checkInBtnEl.style.cursor = 'not-allowed';
					checkInBtnEl.textContent = 'Already checked in';

					// Update chart data tanpa reload: set actual untuk hari ini menjadi 1
					// Gunakan array hari yang konsisten (0 = Minggu .. 6 = Sabtu)
					const todayObj = new Date();
					const dayOrder = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
					const todayNameIndo = dayOrder[todayObj.getDay()]; // e.g. "Senin"
					const idx = window.globalDaysOfWeek.indexOf(todayNameIndo);
					if (idx !== -1 && window.globalActualData[idx] !== 1) {
						window.globalActualData[idx] = 1;
						// update chart dataset and progress text
						if (window.weeklyProgressChart) {
							window.weeklyProgressChart.data.datasets[0].data = window.globalActualData;
							window.weeklyProgressChart.update();
						}
						// update progress text element jika ada
						const progressTextEl = document.getElementById("progressText");
						if (progressTextEl) {
							const totalCompleted = window.globalActualData.reduce((a, b) => a + b, 0);
							const totalTarget = window.globalTargetData.reduce((a, b) => a + b, 0);
							progressTextEl.innerHTML = `<strong>Anda telah menyelesaikan ${totalCompleted} dari ${totalTarget} target belajar minggu ini.</strong>`;
						}
					}
				} else {
					if (statusEl) {
						statusEl.textContent = data.message || 'Check-in failed';
					}
				}
			} catch (err) {
				console.error(err);
				if (statusEl) {
					statusEl.textContent = 'Connection error';
				}
			}
		});
	} else {
		console.warn('checkInBtn element not found in DOM.');
	}

	// Panggil checkStudyDay setelah DOM siap supaya manipulasi tombol aman
	if (typeof checkStudyDay === 'function') {
		checkStudyDay();
	}
});

// Function to check if today is a study day and enable/disable check-in button
async function checkStudyDay() {
  const checkInBtn = document.getElementById('checkInBtn');
  if (!checkInBtn) {
    console.warn('checkInBtn not found, aborting checkStudyDay.');
    return;
  }

  // Disable by default
  checkInBtn.disabled = true;
  checkInBtn.style.background = '#cccccc';
  checkInBtn.style.cursor = 'not-allowed';
  checkInBtn.textContent = 'Loading...';

  try {
    // Ambil target user (jadwal hari)
    const res = await fetch(`${API_BASE}/targets?user_id=${USER_ID}`);
    if (!res.ok) {
      throw new Error('Failed to fetch targets');
    }
    const payload = await res.json();

    if (payload.success && Array.isArray(payload.data) && payload.data.length > 0) {
      const target = payload.data[0];
      const rawDays = target.days !== undefined ? target.days : [];

      const daysOrder = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
      const targetBool = parseTargetDays(rawDays, daysOrder);

      const today = new Date();
      const todayIdx = (today.getDay() + 6) % 7; // map JS 0..6 -> Senin..Minggu index
      const isStudyDay = !!targetBool[todayIdx];

      // Cek apakah user sudah check-in hari ini dengan memanggil weekly endpoint
      const weeklyRes = await fetch(`${API_BASE}/dashboard/weekly?user_id=${USER_ID}`);
      let alreadyCheckedIn = false;
      if (weeklyRes.ok) {
        const weeklyJson = await weeklyRes.json();
        if (weeklyJson.success && Array.isArray(weeklyJson.data.actualDetails)) {
          const todayISO = new Date().toISOString().split('T')[0];
          alreadyCheckedIn = weeklyJson.data.actualDetails.some(log => log.log_date === todayISO);
        }
      }

      // Jika backend belum menunjukkan check-in namun localStorage menandai check-in hari ini, gunakan itu juga
      const todayISO = new Date().toISOString().split('T')[0];
      if (!alreadyCheckedIn) {
        const localFlag = localStorage.getItem('checked_in_today') || localStorage.getItem('just_logged');
        if (localFlag === todayISO) alreadyCheckedIn = true;
      }

      if (isStudyDay) {
        if (alreadyCheckedIn) {
          checkInBtn.disabled = true;
          checkInBtn.style.background = '#cccccc';
          checkInBtn.style.cursor = 'not-allowed';
          checkInBtn.textContent = 'Already checked in';
        } else {
          checkInBtn.disabled = false;
          checkInBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          checkInBtn.style.cursor = 'pointer';
          checkInBtn.textContent = 'Check In Today';
        }
      } else {
        checkInBtn.disabled = true;
        checkInBtn.style.background = '#cccccc';
        checkInBtn.style.cursor = 'not-allowed';
        checkInBtn.textContent = 'Not a study day';
      }
    } else {
      // No schedule set
      checkInBtn.disabled = true;
      checkInBtn.style.background = '#cccccc';
      checkInBtn.style.cursor = 'not-allowed';
      checkInBtn.textContent = 'No study schedule set';
    }
  } catch (err) {
    console.error('Error checking study day:', err);
    checkInBtn.disabled = true;
    checkInBtn.style.background = '#cccccc';
    checkInBtn.style.cursor = 'not-allowed';
    checkInBtn.textContent = 'Error loading schedule';
  }
}