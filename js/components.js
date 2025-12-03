// 簡單工具 & 共用函式

// 圖片壓縮：回傳 base64
window.compressImage = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 800;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const w = img.width * scale;
        const h = img.height * scale;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

window.formatYearMonth = function(year, month) {
  if (!year || !month) return "";
  return `${year} 年 ${month} 月`;
};

window.formatDateTime = function(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

window.isDeadlinePassed = function(deadlineStr) {
  if (!deadlineStr) return false;
  const now = new Date();
  const d = new Date(deadlineStr);
  if (isNaN(d.getTime())) return false;
  return now > d;
};

// 解析 proofImage：JSON 陣列 or 單一字串
window.parseImages = function(imgStr) {
  if (!imgStr) return [];
  try {
    const parsed = JSON.parse(imgStr);
    return Array.isArray(parsed) ? parsed : [imgStr];
  } catch {
    return [imgStr];
  }
};

// 簡單根據 uid / taskId 找該任務所有 submission
window.getSubsByTaskForUser = function(submissions, uid, taskId) {
  return submissions.filter(s => s.uid === uid && s.taskId === taskId);
};

// 任務狀態（給 user 的任務列表用）
window.getTaskStatusForUser = function(task, submissions, uid) {
  if (!uid) return null;
  const subs = getSubsByTaskForUser(submissions, uid, task.id);

  if (subs.length === 0) {
    return "none"; // 尚未提交
  }
  const hasPending = subs.some(s => s.status === "pending");
  const hasApproved = subs.some(s => s.status === "approved");
  if (hasPending) return "pending";
  if (hasApproved) return "approved";
  return "rejected";
};
