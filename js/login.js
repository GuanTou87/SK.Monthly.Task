document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("login-username");
  const passwordInput = document.getElementById("login-password");
  const loginBtn = document.getElementById("login-btn");
  const errorEl = document.getElementById("login-error");

  loginBtn.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) {
      errorEl.textContent = "請輸入帳號與密碼";
      return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = "登入中…";
    errorEl.textContent = "";

    try {
      const user = await window.api.call("login", { username, password });
      // 預期 user 物件：{ uid, username, isAdmin, points, ... }
      localStorage.setItem("pogo_current_user", JSON.stringify(user));
      if (user.isAdmin) {
        window.location.href = "admin.html";
      } else {
        window.location.href = "user.html";
      }
    } catch (e) {
      errorEl.textContent = e.message || "登入失敗";
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "登入";
    }
  });

  // Enter 快速登入
  [usernameInput, passwordInput].forEach(el => {
    el.addEventListener("keydown", e => {
      if (e.key === "Enter") loginBtn.click();
    });
  });
});
