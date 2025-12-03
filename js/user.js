let currentUser = null;
let tasks = [];
let submissions = [];
let users = [];
let selectedTaskForSubmit = null;
let selectedImagesBase64 = [];

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("pogo_current_user");
  if (!saved) {
    window.location.href = "login.html";
    return;
  }
  currentUser = JSON.parse(saved);
  if (currentUser.isAdmin) {
    // 管理員誤闖 user 頁面，導回 admin
    window.location.href = "admin.html";
    return;
  }

  initUserPage();
  loadData();
});

function initUserPage() {
  // header 顯示
  document.getElementById("user-role-badge").textContent = "成員";
  document.getElementById("user-points").textContent = `${currentUser.points || 0} pts`;

  // profile 基本資訊
  document.getElementById("profile-role").textContent = "身分：成員";
  document.getElementById("profile-uid").textContent = currentUser.uid || "";
  document.getElementById("profile-points").textContent = currentUser.points || 0;

  document.getElementById("logout-btn").addEventListener("click", () => {
    localStorage.removeItem("pogo_current_user");
    window.location.href = "login.html";
  });

  // tab 切換
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });

  document.getElementById("refresh-btn").addEventListener("click", loadData);

  // 提交 Modal 相關
  const submitImageArea = document.getElementById("submit-image-area");
  const submitImageInput = document.getElementById("submit-image-input");
  const submitImagePreview = document.getElementById("submit-image-preview");
  const submitImageEmpty = document.getElementById("submit-image-empty");

  submitImageArea.addEventListener("click", () => submitImageInput.click());
  submitImageInput.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const f of files) {
      const base64 = await window.compressImage(f);
      selectedImagesBase64.push(base64);
    }
    renderSubmitImages();
  });

  document.getElementById("submit-cancel").addEventListener("click", closeSubmitModal);
  document.getElementById("submit-confirm").addEventListener("click", handleSubmitTask);

  function renderSubmitImages() {
    submitImagePreview.innerHTML = "";
    if (selectedImagesBase64.length === 0) {
      submitImageEmpty.classList.remove("hidden");
    } else {
      submitImageEmpty.classList.add("hidden");
      selectedImagesBase64.forEach((src, idx) => {
        const img = document.createElement("img");
        img.src = src;
        img.className = "w-16 h-16 object-cover rounded shadow-sm border border-white";
        img.title = `image ${idx + 1}`;
        submitImagePreview.appendChild(img);
      });
    }
  }

  // 圖片大圖預覽
  const viewer = document.getElementById("image-viewer");
  const viewerImg = document.getElementById("image-viewer-img");
  const viewerClose = document.getElementById("image-viewer-close");
  viewerClose.addEventListener("click", () => viewer.classList.add("hidden"));
  viewer.addEventListener("click", (e) => {
    if (e.target === viewer) viewer.classList.add("hidden");
  });

  window.openImageViewer = (url) => {
    viewerImg.src = url;
    viewer.classList.remove("hidden");
  };
}

function switchTab(name) {
  const sections = {
    tasks: document.getElementById("tab-tasks"),
    leaderboard: document.getElementById("tab-leaderboard"),
    profile: document.getElementById("tab-profile"),
  };
  Object.keys(sections).forEach(k => {
    sections[k].classList.toggle("hidden", k !== name);
  });
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("text-indigo-600", btn.dataset.tab === name);
  });
}

async function loadData() {
  try {
    const data = await window.api.call("get_data");
    tasks = Array.isArray(data.tasks) ? data.tasks : [];
    users = Array.isArray(data.users) ? data.users : [];
    submissions = Array.isArray(data.submissions) ? data.submissions : [];

    // 更新 currentUser 最新 points
    const fresh = users.find(u => u.uid === currentUser.uid);
    if (fresh) {
      currentUser = { ...currentUser, ...fresh };
      localStorage.setItem("pogo_current_user", JSON.stringify(currentUser));
      document.getElementById("user-points").textContent = `${currentUser.points || 0} pts`;
      document.getElementById("profile-points").textContent = currentUser.points || 0;
    }

    renderTasks();
    renderLeaderboard();
    renderProfileStats();
    renderHistory();
  } catch (e) {
    alert("載入資料失敗：" + e.message);
  }
}

// 任務列表
function renderTasks() {
  const wrapper = document.getElementById("tasks-wrapper");
  const empty = document.getElementById("tasks-empty");
  wrapper.innerHTML = "";

  if (!tasks.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  // 依年/月分組
  const groups = {};
  tasks.forEach(t => {
    const key = `${t.year || "?"}-${t.month || "?"}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  const groupKeys = Object.keys(groups).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    if (ya !== yb) return ya - yb;
    return ma - mb;
  });

  groupKeys.forEach(key => {
    const [year, month] = key.split("-");
    const label = window.formatYearMonth(Number(year), Number(month));

    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-3";

    const header = document.createElement("div");
    header.className = "p-3 bg-slate-50 border-b border-gray-100 flex justify-between items-center";
    header.innerHTML = `<div class="flex items-center gap-2 font-bold text-slate-700">
      <span class="text-sm">📅 ${label}</span>
      <span class="text-xs font-normal text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">${groups[key].length} 任務</span>
    </div>`;
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "p-2 space-y-2";

    groups[key].forEach(task => {
      const row = document.createElement("div");
      row.className = "p-3 bg-white border border-gray-50 rounded-lg flex justify-between items-center hover:border-indigo-100 transition";

      const left = document.createElement("div");
      left.className = "flex items-center gap-3";

      const iconDiv = document.createElement("div");
      iconDiv.className = "text-xl w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center";
      iconDiv.textContent = task.icon || "📌";

      const textDiv = document.createElement("div");
      const titleDiv = document.createElement("div");
      titleDiv.className = "font-bold text-sm text-slate-800";
      titleDiv.textContent = task.title || "(未命名任務)";

      const descDiv = document.createElement("div");
      descDiv.className = "text-[11px] text-gray-500 truncate max-w-[180px]";
      descDiv.textContent = task.description || "";

      const ptsDiv = document.createElement("div");
      if (task.type === "variable") {
        ptsDiv.className = "text-xs text-yellow-600 font-bold";
        ptsDiv.textContent = "由管理員評分";
      } else {
        ptsDiv.className = "text-xs text-indigo-600 font-bold";
        ptsDiv.textContent = `+${task.points || 0} pts`;
      }

      textDiv.appendChild(titleDiv);
      if (task.description) textDiv.appendChild(descDiv);
      textDiv.appendChild(ptsDiv);

      left.appendChild(iconDiv);
      left.appendChild(textDiv);

      const right = document.createElement("div");
      right.className = "flex gap-2 items-center";

      const deadlinePassed = window.isDeadlinePassed(task.deadline);

      if (deadlinePassed) {
        const badge = document.createElement("span");
        badge.className = "px-3 py-1.5 rounded-lg text-xs font-bold border bg-gray-100 text-gray-500 border-gray-200";
        badge.textContent = "已截止";
        right.appendChild(badge);
      } else {
        // 不管狀態如何，只要沒截止都可以一直提交
        const btn = document.createElement("button");
        btn.className = "px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700";
        btn.textContent = "提交";
        btn.addEventListener("click", () => openSubmitModal(task));
        right.appendChild(btn);
      }

      row.appendChild(left);
      row.appendChild(right);
      body.appendChild(row);
    });

    card.appendChild(body);
    wrapper.appendChild(card);
  });
}


// 排行榜：顯示 uid
function renderLeaderboard() {
  const body = document.getElementById("leaderboard-body");
  body.innerHTML = "";

  const list = (users || [])
    .filter(u => u.username !== "admin")
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  if (!list.length) {
    body.innerHTML = `<div class="p-8 text-center text-gray-400 text-sm">暫無排名資料</div>`;
    return;
  }

  list.forEach((u, idx) => {
    const row = document.createElement("div");
    row.className = `p-4 flex items-center justify-between border-b border-gray-50 last:border-0 ${
      u.uid === currentUser.uid ? "bg-indigo-50/30" : ""
    }`;
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="font-black w-6 text-center ${idx < 3 ? "text-yellow-500 text-lg" : "text-gray-300"}">
          ${idx + 1}
        </div>
        <div class="font-mono font-bold text-slate-700">${u.uid}</div>
      </div>
      <div class="font-mono font-bold text-slate-800">${u.points || 0}</div>
    `;
    body.appendChild(row);
  });
}

// 個人統計
function renderProfileStats() {
  const mySubs = submissions.filter(s => s.uid === currentUser.uid);
  const doneCount = mySubs.filter(s => s.status === "approved").length;
  document.getElementById("profile-done-count").textContent = doneCount;

  // 每月積分：看任務 year/month + 該 submission 的 points (approved)
  const statsMap = {};
  mySubs.forEach(s => {
    if (s.status !== "approved") return;
    const task = tasks.find(t => t.id === s.taskId);
    if (!task) return;
    const key = `${task.year || "?"}-${task.month || "?"}`;
    statsMap[key] = (statsMap[key] || 0) + Number(s.points || 0);
  });

  const container = document.getElementById("profile-monthly-stats");
  container.innerHTML = "";
  const keys = Object.keys(statsMap).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    if (ya !== yb) return ya - yb;
    return ma - mb;
  });

  if (!keys.length) {
    container.innerHTML = `<div class="text-xs text-gray-400 text-center py-2">尚無積分紀錄</div>`;
    return;
  }

  keys.forEach(k => {
    const [y, m] = k.split("-");
    const div = document.createElement("div");
    div.className = "flex justify-between text-sm";
    div.innerHTML = `
      <span class="text-gray-600 font-medium">${formatYearMonth(Number(y), Number(m))}</span>
      <span class="font-bold text-indigo-600">${statsMap[k]} pts</span>
    `;
    container.appendChild(div);
  });
}

// 提交紀錄
function renderHistory() {
  const wrapper = document.getElementById("history-wrapper");
  wrapper.innerHTML = "";

  const mySubs = submissions.filter(s => s.uid === currentUser.uid);
  if (!mySubs.length) return;

  // 依任務的 year/month 分組
  const groups = {};
  mySubs.forEach(s => {
    const task = tasks.find(t => t.id === s.taskId);
    const key = task ? `${task.year || "?"}-${task.month || "?"}` : "未知";
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const keys = Object.keys(groups).sort((a, b) => {
    const [ya, ma] = a.split("-").map(Number);
    const [yb, mb] = b.split("-").map(Number);
    if (ya !== yb) return yb - ya;
    return mb - ma;
  });

  const statusMap = {
    approved: { text: "完成", cls: "bg-green-50 text-green-600 border-green-100" },
    rejected: { text: "退回", cls: "bg-red-50 text-red-600 border-red-100" },
    pending: { text: "審核中", cls: "bg-yellow-50 text-yellow-600 border-yellow-100" },
  };

  keys.forEach(key => {
    const [y, m] = key.split("-");
    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden";

    const header = document.createElement("div");
    header.className = "bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 border-b border-gray-100";
    header.textContent = formatYearMonth(Number(y), Number(m)) || "未知月份";
    card.appendChild(header);

    const body = document.createElement("div");
    body.className = "divide-y divide-gray-50";

    groups[key]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .forEach(sub => {
        const row = document.createElement("div");
        row.className = "p-3 flex justify-between items-center text-sm";

        const left = document.createElement("div");
        left.className = "flex items-center gap-2";

        const imgs = window.parseImages(sub.proofImage);
        const imgIcon = imgs.length > 0 ? `<span class="text-indigo-400 text-xs">🖼</span>` : "";

        left.innerHTML = `
          <span class="text-slate-700 font-medium">${sub.taskTitle}</span>
          ${imgIcon}
        `;

        const st = statusMap[sub.status] || statusMap.pending;
        const right = document.createElement("span");
        right.className = `text-[10px] font-bold px-2 py-0.5 rounded border ${st.cls}`;
        right.textContent = st.text;

        row.appendChild(left);
        row.appendChild(right);
        body.appendChild(row);
      });

    card.appendChild(body);
    wrapper.appendChild(card);
  });
}

// 開啟提交 modal
function openSubmitModal(task) {
  selectedTaskForSubmit = task;
  selectedImagesBase64 = [];
  document.getElementById("submit-proof").value = "";
  document.getElementById("submit-user-date").value = "";
  document.getElementById("submit-modal-year-month").textContent =
    formatYearMonth(task.year, task.month);
  document.getElementById("submit-modal-icon").textContent = task.icon || "📌";
  document.getElementById("submit-modal-title").textContent = task.title || "";
  document.getElementById("submit-modal-desc").textContent = task.description || "";
  document.getElementById("submit-modal-points").textContent =
    task.type === "variable" ? "管理員評分" : `+${task.points || 0}`;
  document.getElementById("submit-modal-deadline").textContent =
    task.deadline ? `截止時間：${formatDateTime(task.deadline)}` : "";

  // 清空預覽
  document.getElementById("submit-image-preview").innerHTML = "";
  document.getElementById("submit-image-empty").classList.remove("hidden");

  const modal = document.getElementById("submit-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeSubmitModal() {
  const modal = document.getElementById("submit-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  selectedTaskForSubmit = null;
  selectedImagesBase64 = [];
}

// 提交任務
async function handleSubmitTask() {
  if (!selectedTaskForSubmit) return;
  const proof = document.getElementById("submit-proof").value.trim() || "無備註";

  const btn = document.getElementById("submit-confirm");
  btn.disabled = true;
  btn.textContent = "提交中…";
  const userDate = document.getElementById("submit-user-date").value;
  if (!userDate) {
    alert("請選擇您完成任務的日期");
    btn.disabled = false;
    btn.textContent = "提交";
    return;
  }

  try {
    await window.api.call("submit_task", {
      uid: currentUser.uid,
      username: currentUser.username,
      taskId: selectedTaskForSubmit.id,
      taskTitle: selectedTaskForSubmit.title,
      year: selectedTaskForSubmit.year,     // ← 補上
      month: selectedTaskForSubmit.month,   // ← 補上
      deadline: selectedTaskForSubmit.deadline, // ← 補上
      points: selectedTaskForSubmit.points || 0,
      proof,
      userDate,
      imagesBase64: selectedImagesBase64,
    });

    alert("提交成功！");
    closeSubmitModal();
    await loadData();
  } catch (e) {
    alert("提交失敗：" + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "提交";
  }
}
