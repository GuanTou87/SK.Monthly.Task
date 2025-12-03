let adminUser = null;
let adminTasks = [];
let adminSubmissions = [];
let adminUsers = [];
let processingId = null;

document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("pogo_current_user");
  if (!saved) {
    window.location.href = "login.html";
    return;
  }
  adminUser = JSON.parse(saved);
  if (!adminUser.isAdmin) {
    window.location.href = "user.html";
    return;
  }

  initAdminPage();
  loadAdminData();
});

function initAdminPage() {
  document.getElementById("admin-logout").addEventListener("click", () => {
    localStorage.removeItem("pogo_current_user");
    window.location.href = "login.html";
  });

  document.getElementById("admin-refresh").addEventListener("click", loadAdminData);

  // 任務新增 Modal 控制
  const taskModal = document.getElementById("task-modal");
  const taskAddBtn = document.getElementById("task-add-btn");
  const taskCancel = document.getElementById("task-cancel");
  const taskSave = document.getElementById("task-save");
  const typeSelect = document.getElementById("task-type");
  const pointsWrapper = document.getElementById("task-points-wrapper");

  typeSelect.addEventListener("change", () => {
    if (typeSelect.value === "fixed") {
      pointsWrapper.classList.remove("hidden");
    } else {
      pointsWrapper.classList.add("hidden");
    }
  });

  taskAddBtn.addEventListener("click", () => {
    openTaskModal();
  });

  taskCancel.addEventListener("click", () => {
    closeTaskModal();
  });

  taskSave.addEventListener("click", saveTask);

  // 大圖預覽
  const viewer = document.getElementById("admin-image-viewer");
  const viewerImg = document.getElementById("admin-image-viewer-img");
  const viewerClose = document.getElementById("admin-image-viewer-close");
  viewerClose.addEventListener("click", () => viewer.classList.add("hidden"));
  viewer.addEventListener("click", e => {
    if (e.target === viewer) viewer.classList.add("hidden");
  });
  window.adminOpenImageViewer = url => {
    viewerImg.src = url;
    viewer.classList.remove("hidden");
  };
}

async function loadAdminData() {
  try {
    const data = await window.api.call("get_data");
    adminTasks = Array.isArray(data.tasks) ? data.tasks : [];
    adminSubmissions = Array.isArray(data.submissions) ? data.submissions : [];
    adminUsers = Array.isArray(data.users) ? data.users : [];
    renderLeaderboard();
    renderPending();
    renderAdminTasks();
  } catch (e) {
    alert("載入資料失敗：" + e.message);
  }
}

function renderLeaderboard() {
  const wrapper = document.getElementById("leaderboard-body");
  const empty = document.getElementById("leaderboard-empty");
  wrapper.innerHTML = "";

  // 過濾掉 admin + 排序
  const list = (adminUsers || [])
    .filter(u => u.username !== "admin")
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  if (!list.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  list.forEach((u, i) => {
    const row = document.createElement("div");
    row.className = "flex justify-between border-b pb-1 text-sm";

    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="font-black w-6 text-center ${i < 3 ? "text-yellow-500 text-lg" : "text-gray-300"}">
          ${i + 1}
        </div>
        <div class="font-mono font-bold text-slate-700">${u.uid}</div>
      </div>
      <div class="font-mono font-bold text-slate-800">${u.points || 0}</div>
    `;

    wrapper.appendChild(row);
  });
}



// 審核列表
function renderPending() {
  const wrapper = document.getElementById("pending-wrapper");
  const empty = document.getElementById("pending-empty");
  wrapper.innerHTML = "";

  const pending = adminSubmissions.filter(s => s.status === "pending");

  if (!pending.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  pending
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .forEach(sub => {
      const task = adminTasks.find(t => t.id === sub.taskId);
      const isVariable = task?.type === "variable";

      const card = document.createElement("div");
      card.className = "bg-slate-700 p-4 rounded-xl border border-slate-600";

      const header = document.createElement("div");
      header.className = "flex justify-between text-xs text-slate-400 mb-2";
      header.innerHTML = `
        <span class="font-bold text-slate-200">${sub.uid}</span>
        <span class="bg-slate-600 px-1.5 rounded text-white">${task ? formatYearMonth(task.year, task.month) : ""}</span>
      `;
      card.appendChild(header);

      const title = document.createElement("div");
      title.className = "font-bold text-white text-lg mb-1";
      title.textContent = sub.taskTitle || "";
      card.appendChild(title);
      if (sub.userDate) {
        const dateInfo = document.createElement("div");
        dateInfo.className = "text-xs text-slate-300 mb-2";
        dateInfo.textContent = `完成日期：${sub.userDate}`;
        card.appendChild(dateInfo);
      }

      if (task?.description) {
        const desc = document.createElement("div");
        desc.className = "text-xs text-slate-300 mb-3";
        desc.textContent = task.description;
        card.appendChild(desc);
      }

      // 後端圖片欄位名稱為 imageUrls（字串 or JSON 字串）
      // 為通用性保留 fallback
      const rawImg = sub.imageUrls || sub.proofImage || "";
      const imgs = window.parseImages(rawImg);

      if (imgs.length > 0) {
        const imgRow = document.createElement("div");
        imgRow.className = "flex gap-2 overflow-x-auto mb-3 pb-2";
        imgs.forEach(url => {
          if (!url || url === "NoIMG") return;
          const img = document.createElement("img");
          img.src = url;
          img.className = "w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-90 border border-slate-600 flex-shrink-0";
          img.addEventListener("click", () => window.adminOpenImageViewer(url));
          imgRow.appendChild(img);
        });
        card.appendChild(imgRow);
      }

      const proof = document.createElement("div");
      proof.className = "text-xs bg-slate-800 p-3 rounded-lg mb-3 text-slate-300 border border-slate-600";
      proof.textContent = "備註：" + (sub.proof || "無");
      card.appendChild(proof);

      let inputPoints = null;
      if (isVariable) {
        const wrap = document.createElement("div");
        wrap.className = "mb-3";
        wrap.innerHTML = `<label class="text-xs text-slate-300 block mb-1">請輸入本次給的分數</label>`;
        inputPoints = document.createElement("input");
        inputPoints.type = "number";
        inputPoints.className = "w-full p-2 bg-slate-800 text-white border border-slate-600 rounded";
        inputPoints.placeholder = "例如 10";
        wrap.appendChild(inputPoints);
        card.appendChild(wrap);
      } else {
        const fixed = document.createElement("div");
        fixed.className = "text-xs text-slate-300 mb-3";
        fixed.textContent = `固定分數：${task?.points || sub.points || 0} pts`;
        card.appendChild(fixed);
      }

      const btnRow = document.createElement("div");
      btnRow.className = "flex gap-2";

      const approveBtn = document.createElement("button");
      approveBtn.className = "flex-1 bg-green-500 hover:bg-green-600 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50";
      approveBtn.textContent = "✔ 通過";

      approveBtn.addEventListener("click", () => {
        let pts = task?.points || 0;
        if (isVariable) {
          const val = Number(inputPoints?.value || 0);
          if (isNaN(val) || val <= 0) {
            alert("請輸入有效的分數");
            return;
          }
          pts = val;
        }
        handleReview(sub.id, "approve", pts);
      });

      const rejectBtn = document.createElement("button");
      rejectBtn.className = "flex-1 bg-slate-600 hover:bg-red-500 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50";
      rejectBtn.textContent = "✖ 退回";
      rejectBtn.addEventListener("click", () => handleReview(sub.id, "reject", 0));

      btnRow.appendChild(approveBtn);
      btnRow.appendChild(rejectBtn);
      card.appendChild(btnRow);

      wrapper.appendChild(card);
    });
}

async function handleReview(submissionId, action, points) {
  if (processingId) return;
  processingId = submissionId;
  try {
    await window.api.call("review_submission", {
      submissionId,
      status: action,
      points,
    });
    await loadAdminData();
  } catch (e) {
    alert("操作失敗：" + e.message);
  } finally {
    processingId = null;
  }
}

// 任務管理列表
function renderAdminTasks() {
  const wrapper = document.getElementById("tasks-admin-wrapper");
  const empty = document.getElementById("tasks-admin-empty");
  wrapper.innerHTML = "";

  if (!adminTasks.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  adminTasks
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    })
    .forEach(task => {
      const row = document.createElement("div");
      row.className = "p-3 bg-white border border-gray-100 rounded-lg flex justify-between items-center";

      const left = document.createElement("div");
      left.className = "flex items-center gap-3";

      left.innerHTML = `
        <div class="text-xl w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
          ${task.icon || "📌"}
        </div>
        <div>
          <div class="font-bold text-sm text-slate-800">${task.title || ""}</div>
          <div class="text-[11px] text-gray-500">${formatYearMonth(task.year, task.month)}</div>
          <div class="text-[11px] text-gray-500">
            ${task.type === "variable" ? "管理員打分" : `固定分數：${task.points || 0} pts`}
          </div>
          <div class="text-[11px] text-red-500">
            截止：${task.deadline ? formatDateTime(task.deadline) : "未設定"}
          </div>
        </div>
      `;

      const right = document.createElement("div");
      right.className = "flex gap-2";

      const delBtn = document.createElement("button");
      delBtn.className = "p-1.5 text-red-400 bg-red-50 rounded-lg hover:bg-red-100";
      delBtn.textContent = "刪除";
      delBtn.addEventListener("click", () => {
        if (confirm("確定刪除此任務？")) {
          deleteTask(task.id);
        }
      });

      right.appendChild(delBtn);
      row.appendChild(left);
      row.appendChild(right);
      wrapper.appendChild(row);
    });
}

async function deleteTask(taskId) {
  try {
    await window.api.call("delete_task", { taskId });
    await loadAdminData();
  } catch (e) {
    alert("刪除失敗：" + e.message);
  }
}

// 任務新增 Modal 開關
function openTaskModal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  document.getElementById("task-title").value = "";
  document.getElementById("task-type").value = "fixed";
  document.getElementById("task-year").value = y;
  document.getElementById("task-month").value = m;
  document.getElementById("task-points").value = 10;
  document.getElementById("task-icon").value = "🐾";
  document.getElementById("task-description").value = "";
  document.getElementById("task-deadline").value = "";

  document.getElementById("task-points-wrapper").classList.remove("hidden");

  const modal = document.getElementById("task-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closeTaskModal() {
  const modal = document.getElementById("task-modal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
}

async function saveTask() {
  const title = document.getElementById("task-title").value.trim();
  const type = document.getElementById("task-type").value;
  const year = Number(document.getElementById("task-year").value || 0);
  const month = Number(document.getElementById("task-month").value || 0);
  const points = Number(document.getElementById("task-points").value || 0);
  const icon = document.getElementById("task-icon").value || "📌";
  const description = document.getElementById("task-description").value.trim();
  const deadlineDate = document.getElementById("task-deadline").value; // yyyy-mm-dd

  if (!title) {
    alert("請輸入標題");
    return;
  }
  if (!year || !month) {
    alert("請輸入正確的年份與月份");
    return;
  }

  let deadline = "";
  if (deadlineDate) {
    // 設定為該日 23:59:59
    deadline = `${deadlineDate}T23:59:59`;
  }

  const task = {
    id: "", // 由後端產生或在後端補 t_ + Date.now()
    title,
    type,
    year,
    month,
    points: type === "fixed" ? points : 0,
    icon,
    description,
    deadline,
  };

  try {
    await window.api.call("add_task", { task });
    closeTaskModal();
    await loadAdminData();
  } catch (e) {
    alert("儲存任務失敗：" + e.message);
  }
}
