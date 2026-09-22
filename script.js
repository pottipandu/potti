const SUPABASE_URL = "https://supabase.com/dashboard/project/wfhyyzoxknvdpfyxxmbp";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";
const GALLERY_EMAIL = "taara510p@gmail.com";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const BUCKET_NAME = "private-gallery";

let enteredPin = "";

const loginScreen = document.getElementById("loginScreen");
const galleryScreen = document.getElementById("galleryScreen");
const pinInput = document.getElementById("pinInput");
const pinDots = document.getElementById("pinDots");
const message = document.getElementById("message");
const galleryGrid = document.getElementById("galleryGrid");
const emptyState = document.getElementById("emptyState");
const photoInput = document.getElementById("photoInput");
const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");

document.addEventListener("DOMContentLoaded", async () => {
  setupPinInput();

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    showGallery();
  } else {
    showLogin();
  }
});

function setupPinInput() {
  if (!pinInput) return;

  pinInput.addEventListener("input", () => {
    enteredPin = pinInput.value;
    updatePinDisplay();
  });

  pinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      unlockGallery();
    }
  });
}

function updatePinDisplay() {
  if (!pinDots) return;

  pinDots.innerHTML = "";

  for (let i = 0; i < enteredPin.length; i++) {
    const dot = document.createElement("span");
    dot.className = "pin-dot filled";
    dot.textContent = "•";
    pinDots.appendChild(dot);
  }
}

function unlockGallery() {
  if (!enteredPin) {
    showMessage("Please enter your password.", true);
    return;
  }

  authenticate();
}

async function authenticate() {
  showMessage("Checking...");

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: GALLERY_EMAIL,
      password: enteredPin
    });

  if (error) {
    console.error("Authentication error:", error);
    showMessage("Incorrect password.", true);
    return;
  }

  if (data.session) {
    enteredPin = "";

    if (pinInput) {
      pinInput.value = "";
    }

    updatePinDisplay();
    showGallery();
  }
}

function showLogin() {
  if (loginScreen) {
    loginScreen.style.display = "flex";
  }

  if (galleryScreen) {
    galleryScreen.style.display = "none";
  }

  enteredPin = "";

  if (pinInput) {
    pinInput.value = "";

    setTimeout(() => {
      pinInput.focus();
    }, 100);
  }

  updatePinDisplay();
}

async function showGallery() {
  if (loginScreen) {
    loginScreen.style.display = "none";
  }

  if (galleryScreen) {
    galleryScreen.style.display = "block";
  }

  await loadPhotos();
}

async function loadPhotos() {
  if (!galleryGrid) return;

  galleryGrid.innerHTML = "";

  const { data: photos, error } =
    await supabaseClient
      .from("photos")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {
    console.error("Database error:", error);
    showMessage("Unable to load gallery.", true);
    return;
  }

  if (!photos || photos.length === 0) {
    if (emptyState) {
      emptyState.style.display = "block";
    }
    return;
  }

  if (emptyState) {
    emptyState.style.display = "none";
  }

  for (const photo of photos) {
    const { data: signedUrlData, error: urlError } =
      await supabaseClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          photo.storage_path,
          3600
        );

    if (urlError) {
      console.error("Signed URL error:", urlError);
      continue;
    }

    createPhotoCard(
      photo,
      signedUrlData.signedUrl
    );
  }
}

function createPhotoCard(photo, imageUrl) {
  const card = document.createElement("div");
  card.className = "photo-card";

  const image = document.createElement("img");

  image.src = imageUrl;
  image.alt = photo.caption || photo.file_name;
  image.loading = "lazy";

  image.addEventListener("click", () => {
    openViewer(imageUrl);
  });

  const info = document.createElement("div");
  info.className = "photo-info";

  const title = document.createElement("div");

  title.textContent =
    photo.caption || photo.file_name;

  const deleteButton =
    document.createElement("button");

  deleteButton.textContent = "Delete";

  deleteButton.addEventListener(
    "click",
    async (event) => {
      event.stopPropagation();
      await deletePhoto(photo);
    }
  );

  info.appendChild(title);
  info.appendChild(deleteButton);

  card.appendChild(image);
  card.appendChild(info);

  galleryGrid.appendChild(card);
}

if (photoInput) {
  photoInput.addEventListener(
    "change",
    async () => {
      const files =
        Array.from(photoInput.files || []);

      for (const file of files) {
        await uploadPhoto(file);
      }

      photoInput.value = "";
      await loadPhotos();
    }
  );
}

async function handleEmptyUpload(event) {
  const files =
    Array.from(event.target.files || []);

  for (const file of files) {
    await uploadPhoto(file);
  }

  event.target.value = "";
  await loadPhotos();
}

async function uploadPhoto(file) {
  if (
    !file ||
    !file.type.startsWith("image/")
  ) {
    showMessage(
      "Please select an image.",
      true
    );
    return;
  }

  const extension =
    file.name.includes(".")
      ? file.name.split(".").pop()
      : "jpg";

  const filePath =
    `gallery/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } =
    await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

  if (uploadError) {
    console.error("Upload error:", uploadError);

    showMessage(
      "Upload failed.",
      true
    );

    return;
  }

  const { error: dbError } =
    await supabaseClient
      .from("photos")
      .insert({
        file_name: file.name,
        storage_path: filePath,
        caption: ""
      });

  if (dbError) {
    console.error(
      "Database insert error:",
      dbError
    );

    await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    showMessage(
      "Photo information could not be saved.",
      true
    );

    return;
  }

  showMessage(
    "Photo added successfully."
  );
}

async function deletePhoto(photo) {
  const confirmed =
    confirm(
      `Delete "${photo.file_name}"?`
    );

  if (!confirmed) return;

  const { error: storageError } =
    await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([photo.storage_path]);

  if (storageError) {
    console.error(
      "Storage delete error:",
      storageError
    );

    showMessage(
      "Could not delete photo.",
      true
    );

    return;
  }

  const { error: dbError } =
    await supabaseClient
      .from("photos")
      .delete()
      .eq("id", photo.id);

  if (dbError) {
    console.error(
      "Database delete error:",
      dbError
    );

    showMessage(
      "Photo file deleted, but database cleanup failed.",
      true
    );

    return;
  }

  await loadPhotos();
}

function openViewer(imageUrl) {
  if (!viewer || !viewerImage) return;

  viewerImage.src = imageUrl;
  viewer.style.display = "flex";
}

function closeViewer() {
  if (!viewer) return;

  viewer.style.display = "none";

  if (viewerImage) {
    viewerImage.src = "";
  }
}

if (viewer) {
  viewer.addEventListener(
    "click",
    (event) => {
      if (event.target === viewer) {
        closeViewer();
      }
    }
  );
}

async function lockGallery() {
  await supabaseClient.auth.signOut();

  closeViewer();
  showLogin();
}

function showMessage(text, isError = false) {
  if (!message) return;

  message.textContent = text;

  message.className =
    isError
      ? "message error"
      : "message";

  setTimeout(() => {
    if (message.textContent === text) {
      message.textContent = "";
    }
  }, 3000);
}
