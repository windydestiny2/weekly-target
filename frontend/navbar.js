// Navbar logout functionality
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  window.location.href = 'index.html';
});
