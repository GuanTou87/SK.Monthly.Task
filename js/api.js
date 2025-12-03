class ApiService {
  async call(action, payload = {}) {
    if (!GOOGLE_SCRIPT_URL) {
      throw new Error("GOOGLE_SCRIPT_URL 未設定");
    }
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json();
    if (json.status === "error") {
      throw new Error(json.message);
    }
    return json.data;
  }
}

window.api = new ApiService();
