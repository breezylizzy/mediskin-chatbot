const chatBox = document.getElementById("chatBox");
const chatText = document.getElementById("chatText");
const sendBtn = document.getElementById("sendBtn");

const uploadBtn = document.getElementById("uploadBtn");
const imageInput = document.getElementById("imageInput");
const dropZone = document.getElementById("dropZone");

const imagePreview = document.getElementById("imagePreview");
const previewImg = document.getElementById("previewImg");
const previewName = document.getElementById("previewName");
const previewSize = document.getElementById("previewSize");
const removeImgBtn = document.getElementById("removeImgBtn");

let selectedFile = null;
let isSending = false;

function addBubble(text, who = "user") {
  const div = document.createElement("div");
  div.className = `bubble ${who}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addImageBubble(file, who = "user") {
  const wrap = document.createElement("div");
  wrap.className = `bubble ${who}`;

  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  img.alt = "Gambar yang dikirim";
  img.style.maxWidth = "240px";
  img.style.borderRadius = "12px";
  img.style.display = "block";
  img.style.border = "1px solid rgba(15,23,42,.12)";

  wrap.appendChild(img);
  chatBox.appendChild(wrap);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  const v = bytes / Math.pow(1024, i);
  return `${v.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function setSelectedFile(file) {
  selectedFile = file;

  if (!file) {
    imagePreview.classList.add("hidden");
    previewImg.src = "";
    previewName.textContent = "";
    previewSize.textContent = "";
    return;
  }

  previewImg.src = URL.createObjectURL(file);
  previewName.textContent = file.name;
  previewSize.textContent = formatBytes(file.size);
  imagePreview.classList.remove("hidden");
}

uploadBtn.addEventListener("click", () => imageInput.click());

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    addBubble("File harus gambar ya (jpg/png/webp).", "bot");
    return;
  }
  setSelectedFile(file);
});

removeImgBtn.addEventListener("click", () => {
  setSelectedFile(null);
  imageInput.value = "";
});

// Drag & drop handling 
["dragenter", "dragover"].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach(evt => {
  dropZone.addEventListener(evt, (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    addBubble("File yang di-drop harus gambar ya (jpg/png/webp).", "bot");
    return;
  }
  setSelectedFile(file);
});

function setSendingState(sending) {
  isSending = sending;
  sendBtn.disabled = sending;
  uploadBtn.disabled = sending;
  chatText.disabled = sending;
  if (sending) sendBtn.classList.add("disabled");
  else sendBtn.classList.remove("disabled");
}

async function sendToFlask(message, file) {
  const fd = new FormData();
  fd.append("message", message || "");
  if (file) fd.append("image", file);

  const res = await fetch("/chat", {
    method: "POST",
    body: fd
  });

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `Server error (${res.status})`;
    throw new Error(msg);
  }

  if (!data || data.ok === false) {
    throw new Error((data && data.error) || "Respon server tidak valid.");
  }

  return data; 
}

async function sendMessage() {
  if (isSending) return;

  const msg = chatText.value.trim();
  const file = selectedFile;

  if (!msg && !file) return;

  // tampilkan pesan user
  if (msg) addBubble(msg, "user");
  if (file) addImageBubble(file, "user");

  // reset input UI
  chatText.value = "";
  setSelectedFile(null);
  imageInput.value = "";

  setSendingState(true);
  addBubble("⏳ Memproses...", "bot");

  try {
    const data = await sendToFlask(msg, file);

    // hapus bubble "Memproses..." 
    // cari bubble bot "Memproses..." 
    const bubbles = chatBox.querySelectorAll(".bubble.bot");
    const lastBot = bubbles[bubbles.length - 1];
    if (lastBot && lastBot.textContent === "⏳ Memproses...") {
      lastBot.remove();
    }

    addBubble(data.reply || "(Tidak ada balasan)", "bot");
  } catch (err) {
    // hapus bubble "Memproses..." kalau ada
    const bubbles = chatBox.querySelectorAll(".bubble.bot");
    const lastBot = bubbles[bubbles.length - 1];
    if (lastBot && lastBot.textContent === "⏳ Memproses...") {
      lastBot.remove();
    }

    addBubble(`❌ Gagal: ${err.message}`, "bot");
  } finally {
    setSendingState(false);
  }
}

sendBtn.addEventListener("click", sendMessage);
chatText.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

// init
addBubble("Halo! Aku Mediskin. Kamu bisa kirim teks atau upload gambar 🙂", "bot");
