// ==========================================
// PRIVATE GALLERY - COMPLETE SCRIPT
// ==========================================

// ---------- SUPABASE CONFIG ----------

const SUPABASE_URL = "https://wfhyyzoxknvdpfyxxmbp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";

const GALLERY_EMAIL = "taara510p@gmail.com";

const BUCKET_NAME = "private-gallery";

const SIGNED_URL_SECONDS = 3600;


// ---------- SUPABASE CLIENT ----------

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// ---------- GLOBAL VARIABLES ----------

let enteredPin = "";

let pinInput;
let pinButton;
let loginScreen;
let galleryScreen;
let loginMessage;
let uploadMessage;
let photoInput;
let galleryGrid;
let viewer;


// ==========================================
// PAGE LOAD
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {

  // ---------- GET ELEMENTS ----------

  pinInput = document.getElementById("pinInput");
  pinButton = document.getElementById("pinButton");

  loginScreen = document.getElementById("loginScreen");
  galleryScreen = document.getElementById("galleryScreen");

  loginMessage = document.getElementById("loginMessage");
  uploadMessage = document.getElementById("uploadMessage");

  photoInput = document.getElementById("photoInput");
  galleryGrid = document.getElementById("galleryGrid");

  viewer = document.getElementById("viewer");


  // ---------- PIN INPUT ----------

  if (pinInput) {

    pinInput.addEventListener("input", () => {
      enteredPin = pinInput.value.trim();
    });

    pinInput.addEventListener("keydown", (event) => {

      if (event.key === "Enter") {
        event.preventDefault();
        unlockGallery();
      }

    });

  }


  // ---------- PIN BUTTON ----------

  if (pinButton) {

    pinButton.addEventListener("click", () => {
      unlockGallery();
    });

  }


  // ---------- PHOTO UPLOAD ----------

  if (photoInput) {

    photoInput.addEventListener("change", handlePhotoUpload);

  }


  // ---------- ESCAPE KEY ----------

  document.addEventListener("keydown", (event) => {

    if (event.key === "Escape") {
      closeViewer();
    }

  });


 // ---------- ALWAYS LOCK ON PAGE LOAD / REFRESH ----------

try {

  // Clear any previous Supabase login session
  await supabaseClient.auth.signOut();

  // Always start with the PIN screen
  showLogin();

} catch (error) {

  console.error("Initial lock error:", error);

  showLogin();

}

// ==========================================
// SHOW LOGIN
// ==========================================

function showLogin() {

  if (loginScreen) {
    loginScreen.style.display = "flex";
  }

  if (galleryScreen) {
    galleryScreen.style.display = "none";
  }

  if (loginMessage) {
    loginMessage.textContent = "";
  }

}


// ==========================================
// SHOW GALLERY
// ==========================================

async function showGallery() {

  if (loginScreen) {
    loginScreen.style.display = "none";
  }

  if (galleryScreen) {
    galleryScreen.style.display = "block";
  }

  await loadPhotos();

}


// ==========================================
// UNLOCK GALLERY
// ==========================================

async function unlockGallery() {

  const pin = pinInput ? pinInput.value.trim() : enteredPin;

  if (!pin) {

    showMessage("Please enter your PIN.", true);

    return;

  }


  showMessage("Checking...");


  try {

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({

        email: GALLERY_EMAIL,

        password: pin

      });


    if (error) {

      console.error("Login error:", error);

      showMessage("Incorrect PIN.", true);

      return;

    }


    if (!data || !data.session) {

      showMessage("Unable to unlock gallery.", true);

      return;

    }


    enteredPin = "";

    if (pinInput) {
      pinInput.value = "";
    }


    showMessage("");

    await showGallery();


  } catch (error) {

    console.error("Unlock error:", error);

    showMessage("Something went wrong.", true);

  }

}


// ==========================================
// LOGIN MESSAGE
// ==========================================

function showMessage(message, isError = false) {

  if (!loginMessage) return;

  loginMessage.textContent = message;

  if (isError) {
    loginMessage.classList.add("error");
  } else {
    loginMessage.classList.remove("error");
  }

}


// ==========================================
// UPLOAD MESSAGE
// ==========================================

function showUploadMessage(message, isError = false) {

  if (!uploadMessage) return;

  uploadMessage.textContent = message;

  if (isError) {
    uploadMessage.classList.add("error");
  } else {
    uploadMessage.classList.remove("error");
  }

}


// ==========================================
// LOAD PHOTOS
// ==========================================

async function loadPhotos() {

  if (!galleryGrid) return;


  galleryGrid.innerHTML = "";

  showUploadMessage("");


  try {

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();


    if (!session) {

      showLogin();

      return;

    }


    const { data: photos, error } = await supabaseClient

      .from("photos")

      .select("*")

      .order("created_at", { ascending: false });


    if (error) {

      console.error("Database error:", error);

      galleryGrid.innerHTML = `
        <div class="empty-gallery">
          <p>Unable to load gallery.</p>
        </div>
      `;

      return;

    }


    if (!photos || photos.length === 0) {

      showEmptyGallery();

      return;

    }


    for (const photo of photos) {

      await createPhotoCard(photo);

    }


  } catch (error) {

    console.error("Load photos error:", error);

    galleryGrid.innerHTML = `
      <div class="empty-gallery">
        <p>Unable to load gallery.</p>
      </div>
    `;

  }

}


// ==========================================
// EMPTY GALLERY
// ==========================================

function showEmptyGallery() {

  if (!galleryGrid) return;

  galleryGrid.innerHTML = `
    <div class="empty-gallery">
      <div style="font-size:50px;">📷</div>
      <h3>Your gallery is empty</h3>
      <p>Add your first photo or video.</p>
    </div>
  `;

}


// ==========================================
// CREATE PHOTO / VIDEO CARD
// ==========================================

async function createPhotoCard(photo) {

  try {

    const { data, error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        photo.storage_path,
        SIGNED_URL_SECONDS
      );


    if (error) {

      console.error("Signed URL error:", error);

      return;

    }


    const fileUrl = data.signedUrl;

    const fileName = photo.file_name || "File";

    const extension =
      fileName
        .split(".")
        .pop()
        .toLowerCase();


    const imageExtensions = [
      "jpg",
      "jpeg",
      "png",
      "webp"
    ];


    const videoExtensions = [
      "mp4",
      "webm",
      "mov"
    ];


    const heicExtensions = [
      "heic",
      "heif"
    ];


    const card = document.createElement("div");

    card.className = "photo-card";


    // ======================================
    // IMAGE
    // ======================================

    if (imageExtensions.includes(extension)) {

      card.innerHTML = `

        <div class="media-wrapper">

          <img
            src="${fileUrl}"
            alt="${escapeHtml(fileName)}"
            loading="lazy"
          >

        </div>

        <div class="photo-card-info">

          <span class="file-name">
            ${escapeHtml(fileName)}
          </span>

          <button
            class="delete-button"
            type="button"
          >
            Delete
          </button>

        </div>

      `;


      const image = card.querySelector("img");

      if (image) {

        image.addEventListener("click", () => {

          openViewer(fileUrl, "image");

        });

      }

    }


    // ======================================
    // VIDEO
    // ======================================

    else if (videoExtensions.includes(extension)) {

      card.innerHTML = `

        <div class="media-wrapper">

          <video
            src="${fileUrl}"
            controls
            preload="metadata"
          ></video>

        </div>

        <div class="photo-card-info">

          <span class="file-name">
            ${escapeHtml(fileName)}
          </span>

          <button
            class="delete-button"
            type="button"
          >
            Delete
          </button>

        </div>

      `;


      const video = card.querySelector("video");

      if (video) {

        video.addEventListener("dblclick", () => {

          openViewer(fileUrl, "video");

        });

      }

    }


    // ======================================
    // HEIC / HEIF
    // ======================================

    else if (heicExtensions.includes(extension)) {

      card.innerHTML = `

        <div class="unsupported-file">

          <div>📷</div>

          <strong>HEIC Photo</strong>

          <span>
            ${escapeHtml(fileName)}
          </span>

          <a
            href="${fileUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open / Download
          </a>

        </div>

        <div class="photo-card-info">

          <span class="file-name">
            ${escapeHtml(fileName)}
          </span>

          <button
            class="delete-button"
            type="button"
          >
            Delete
          </button>

        </div>

      `;

    }


    // ======================================
    // OTHER FILE
    // ======================================

    else {

      card.innerHTML = `

        <div class="unsupported-file">

          <div>📁</div>

          <strong>File</strong>

          <span>
            ${escapeHtml(fileName)}
          </span>

          <a
            href="${fileUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open / Download
          </a>

        </div>

        <div class="photo-card-info">

          <span class="file-name">
            ${escapeHtml(fileName)}
          </span>

          <button
            class="delete-button"
            type="button"
          >
            Delete
          </button>

        </div>

      `;

    }


    // ======================================
    // DELETE BUTTON
    // ======================================

    const deleteButton =
      card.querySelector(".delete-button");


    if (deleteButton) {

      deleteButton.addEventListener("click", async (event) => {

        event.stopPropagation();

        await deletePhoto(photo);

      });

    }


    galleryGrid.appendChild(card);


  } catch (error) {

    console.error("Create card error:", error);

  }

}


// ==========================================
// HANDLE PHOTO / VIDEO UPLOAD
// ==========================================

async function handlePhotoUpload(event) {

  const files = event.target.files;


  if (!files || files.length === 0) {
    return;
  }


  showUploadMessage("Uploading...");


  try {

    for (const file of files) {

      await uploadPhoto(file);

    }


    showUploadMessage(
      files.length === 1
        ? "Uploaded successfully."
        : `${files.length} files uploaded successfully.`
    );


    event.target.value = "";


    await loadPhotos();


  } catch (error) {

    console.error("Upload error:", error);

    showUploadMessage(
      error.message || "Upload failed.",
      true
    );

  }

}


// ==========================================
// UPLOAD PHOTO / VIDEO
// ==========================================

async function uploadPhoto(file) {

  // ---------- CHECK SESSION ----------

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();


  if (!session) {

    throw new Error("You are not logged in.");

  }


  // ---------- CHECK FILE ----------

  if (!file) {

    throw new Error("No file selected.");

  }


  // ---------- ALLOWED EXTENSIONS ----------

  const allowedExtensions = [

    "jpg",
    "jpeg",
    "png",
    "webp",

    "heic",
    "heif",

    "mp4",
    "webm",
    "mov"

  ];


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  if (!allowedExtensions.includes(extension)) {

    throw new Error(
      `File type .${extension} is not supported.`
    );

  }


  // ---------- CREATE SAFE FILE NAME ----------

  const timestamp = Date.now();

  const random =
    Math.random()
      .toString(36)
      .substring(2, 10);


  const safeName =
    file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );


  const storagePath =
    `${timestamp}_${random}_${safeName}`;


  // ---------- UPLOAD TO STORAGE ----------

  const {
    error: uploadError
  } = await supabaseClient.storage

    .from(BUCKET_NAME)

    .upload(
      storagePath,
      file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined
      }
    );


  if (uploadError) {

    console.error(
      "Storage upload error:",
      uploadError
    );

    throw uploadError;

  }


  // ---------- SAVE DATABASE RECORD ----------

  const {
    error: databaseError
  } = await supabaseClient

    .from("photos")

    .insert({

      file_name: file.name,

      storage_path: storagePath,

      caption: ""

    });


  // ---------- DELETE STORAGE FILE IF DB FAILED ----------

  if (databaseError) {

    console.error(
      "Database insert error:",
      databaseError
    );


    await supabaseClient.storage

      .from(BUCKET_NAME)

      .remove([storagePath]);


    throw databaseError;

  }

}


// ==========================================
// DELETE PHOTO
// ==========================================

async function deletePhoto(photo) {

  const confirmed =
    confirm(
      `Delete "${photo.file_name}"?`
    );


  if (!confirmed) {
    return;
  }


  try {

    // ---------- DELETE STORAGE FILE ----------

    const {
      error: storageError
    } = await supabaseClient.storage

      .from(BUCKET_NAME)

      .remove([
        photo.storage_path
      ]);


    if (storageError) {

      console.error(
        "Storage delete error:",
        storageError
      );

      throw storageError;

    }


    // ---------- DELETE DATABASE RECORD ----------

    const {
      error: databaseError
    } = await supabaseClient

      .from("photos")

      .delete()

      .eq("id", photo.id);


    if (databaseError) {

      console.error(
        "Database delete error:",
        databaseError
      );

      throw databaseError;

    }


    await loadPhotos();


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );

    alert("Unable to delete this file.");

  }

}


// ==========================================
// OPEN VIEWER
// ==========================================

function openViewer(fileUrl, type = "image") {

  if (!viewer) return;


  viewer.innerHTML = "";


  // ---------- CLOSE BUTTON ----------

  const closeButton =
    document.createElement("button");

  closeButton.className =
    "viewer-close";

  closeButton.type = "button";

  closeButton.textContent = "×";


  closeButton.addEventListener(
    "click",
    closeViewer
  );


  viewer.appendChild(closeButton);


  // ---------- IMAGE ----------

  if (type === "image") {

    const image =
      document.createElement("img");

    image.src = fileUrl;

    image.className = "viewer-media";

    image.alt = "Gallery image";


    viewer.appendChild(image);

  }


  // ---------- VIDEO ----------

  else if (type === "video") {

    const video =
      document.createElement("video");

    video.src = fileUrl;

    video.className = "viewer-media";

    video.controls = true;

    video.autoplay = true;

    video.playsInline = true;


    viewer.appendChild(video);

  }


  // ---------- SHOW VIEWER ----------

  viewer.style.display = "flex";

}


// ==========================================
// CLOSE VIEWER
// ==========================================

function closeViewer() {

  if (!viewer) return;


  viewer.style.display = "none";


  viewer.innerHTML = "";

}


// ==========================================
// LOCK GALLERY
// ==========================================

async function lockGallery() {

  try {

    await supabaseClient.auth.signOut();

  } catch (error) {

    console.error(
      "Sign out error:",
      error
    );

  }


  if (galleryScreen) {
    galleryScreen.style.display = "none";
  }


  if (loginScreen) {
    loginScreen.style.display = "flex";
  }


  if (pinInput) {
    pinInput.value = "";
  }


  enteredPin = "";


  showMessage("");

}

// ==========================================
// AUTO LOCK WHEN LEAVING / HIDING THE SITE
// ==========================================

document.addEventListener("visibilitychange", () => {

  if (document.visibilityState === "hidden") {
    lockGallery();
  }

});

// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHtml(value) {

  if (value === null || value === undefined) {
    return "";
  }


  return String(value)

    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");

}
