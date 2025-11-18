const API_BASE = "http://localhost:5001/api";

const form = document.getElementById("loginForm");
const statusDiv = document.getElementById("status");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem('user_id', data.user.id);
      localStorage.setItem('username', data.user.username);
      window.location.href = 'dashboard.html';
    } else {
      statusDiv.textContent = data.message || "Login failed";
    }
  } catch (err) {
    console.error(err);
    statusDiv.textContent = "Connection error";
  }
});
