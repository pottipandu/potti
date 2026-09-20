```javascript
// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL = "https://supabase.com/dashboard/project/wfhyyzoxknvdpfyxxmbp";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";
const GALLERY_EMAIL = "taara510p@gmail.com";

const BUCKET_NAME = "private-gallery";


// =====================================================
// CHECK CONFIGURATION
// =====================================================

if (
  SUPABASE_URL.includes("YOUR_") ||
  SUPABASE_PUBLISHABLE_KEY.includes("YOUR_") ||
  GALLERY_EMAIL.includes("YOUR_")
) {
  console.error(
    "Gallery configuration is incomplete. Check SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and GALLERY_EMAIL."
  );
}


// =====================================================
// SUPABASE CLIENT
// =====================================================

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// =====================================================
// PAGE ELEMENTS
// =====================================================

const loginScreen = document.getElementById("loginScreen");
const galleryScreen = document.getElementById("galleryScreen");

const loginForm = document.getElementById("loginForm");
const pinInput = document.getElementById("pinInput");
const message = document.getElementById("message");

const galleryGrid = document.getElementById("galleryGrid");
const emptyState = document.getElementById("emptyState");

const photoInput = document.getElementById("photoInput");
const emptyPhotoInput = document.getElementById("emptyPhotoInput");

const lockButton = document.getElementById("lockButton");

const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");
const viewerClose = document.getElementById("viewerClose");


// =====================================================
// START APPLICATION
// =====================================================

document.addEventListener("DOMContentLoaded", checkSession);


async function checkSession() {
  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) {
      console.error("Session error:", error);
      showLogin();
      return;
    }

    if (data.session) {
      await showGallery();
    } else {
      showLogin();
    }

  } catch (error) {
    console.error("Startup error:", error);
    showLogin();
  }
}


// =====================================================
// LOGIN
// =====================================================

loginForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  await unlockGallery();
});


async function unlockGallery() {
  const password = pinInput.value.trim();

  if (!password) {
    showMessage("Please enter your password.", true);
    return;
  }

  showMessage("Checking password...");

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email: GALLERY_EMAIL,
        password: password
      });

    if (error) {
      console.error("Login error:", error);

      showMessage(
        "Incorrect password.",
        true
      );

      return;
    }

    if (data.session) {
      pinInput.value = "";

      showMessage("Unlocked!");

      await showGallery();
    }

  } catch (error) {
    console.error("Unexpected login error:", error);

    showMessage(
      "Something went wrong. Check the browser console.",
      true
    );
  }
}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {
  loginScreen.style.display = "flex";
  galleryScreen.style.display = "none";

  pinInput.value = "";

  setTimeout(function () {
    pinInput.focus();
  }, 100);
}


// =====================================================
// SHOW GALLERY
// =====================================================

async function showGallery() {
  loginScreen.style.display = "none";
  galleryScreen.style.display = "block";

  await loadPhotos();
}


// =====================================================
// LOAD PHOTOS
// =====================================================

async function loadPhotos() {
  galleryGrid.innerHTML = "";

  try {
    const { data: photos, error } =
      await supabaseClient
        .from("photos")
        .select("*")
        .order("created_at", {
          ascending: false
        });

    if (error) {
      console.error("Database load error:", error);

      showMessage(
        "Unable to load gallery.",
        true
      );

      return;
    }

    if (!photos || photos.length === 0) {
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    for (const photo of photos) {
      await createPhotoCardFromStorage(photo);
    }

  } catch (error) {
    console.error("Gallery loading error:", error);

    showMessage(
      "Gallery could not be loaded.",
      true
    );
  }
}


// =====================================================
// CREATE PHOTO CARD
// =====================================================

async function createPhotoCardFromStorage(photo) {
  try {
    const { data, error } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          photo.storage_path,
          3600
        );

    if (error) {
      console.error(
        "Signed URL error:",
        error
      );

      return;
    }

    createPhotoCard(
      photo,
      data.signedUrl
    );

  } catch (error) {
    console.error(
      "Photo card error:",
      error
    );
  }
}


function createPhotoCard(photo, imageUrl) {
  const card = document.createElement("div");

  card.className = "photo-card";


  // IMAGE

  const image = document.createElement("img");

  image.src = imageUrl;

  image.alt =
    photo.caption ||
    photo.file_name;

  image.loading = "lazy";

  image.addEventListener("click", function () {
    openViewer(imageUrl);
  });


  // INFO AREA

  const info = document.createElement("div");

  info.className = "photo-info";


  // TITLE

  const title = document.createElement("div");

  title.textContent =
    photo.caption ||
    photo.file_name;


  // DELETE BUTTON

  const deleteButton =
    document.createElement("button");

  deleteButton.type = "button";

  deleteButton.textContent = "Delete";

  deleteButton.addEventListener(
    "click",
    async function () {
      await deletePhoto(photo);
    }
  );


  info.appendChild(title);
  info.appendChild(deleteButton);

  card.appendChild(image);
  card.appendChild(info);

  galleryGrid.appendChild(card);
}


// =====================================================
// UPLOAD FROM HEADER
// =====================================================

photoInput.addEventListener(
  "change",
  async function () {

    const files =
      Array.from(
        photoInput.files || []
      );

    await uploadFiles(files);

    photoInput.value = "";
  }
);


// =====================================================
// UPLOAD FROM EMPTY STATE
// =====================================================

emptyPhotoInput.addEventListener(
  "change",
  async function () {

    const files =
      Array.from(
        emptyPhotoInput.files || []
      );

    await uploadFiles(files);

    emptyPhotoInput.value = "";
  }
);


// =====================================================
// UPLOAD MULTIPLE FILES
// =====================================================

async function uploadFiles(files) {
  if (!files.length) {
    return;
  }

  showMessage("Uploading photos...");

  for (const file of files) {
    await uploadPhoto(file);
  }

  await loadPhotos();
}


// =====================================================
// UPLOAD ONE PHOTO
// =====================================================

async function uploadPhoto(file) {

  if (!file.type.startsWith("image/")) {

    showMessage(
      "Only image files are allowed.",
      true
    );

    return;
  }


  const extension =
    file.name.includes(".")
      ? file.name
          .split(".")
          .pop()
          .toLowerCase()
      : "jpg";


  const storagePath =
    "gallery/" +
    crypto.randomUUID() +
    "." +
    extension;


  try {

    // UPLOAD FILE TO PRIVATE STORAGE

    const { error: uploadError } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .upload(
          storagePath,
          file
        );


    if (uploadError) {

      console.error(
        "Storage upload error:",
        uploadError
      );

      showMessage(
        "Photo upload failed.",
        true
      );

      return;
    }


    // SAVE PHOTO INFORMATION

    const { error: databaseError } =
      await supabaseClient
        .from("photos")
        .insert({
          file_name: file.name,
          storage_path: storagePath,
          caption: ""
        });


    if (databaseError) {

      console.error(
        "Database insert error:",
        databaseError
      );


      // REMOVE FILE IF DATABASE SAVE FAILED

      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .remove([
          storagePath
        ]);


      showMessage(
        "Photo information could not be saved.",
        true
      );

      return;
    }


    showMessage(
      "Photo added successfully."
    );

  } catch (error) {

    console.error(
      "Unexpected upload error:",
      error
    );

    showMessage(
      "Photo upload failed.",
      true
    );
  }
}


// =====================================================
// DELETE PHOTO
// =====================================================

async function deletePhoto(photo) {

  const confirmed =
    window.confirm(
      'Delete "' +
      photo.file_name +
      '"?'
    );


  if (!confirmed) {
    return;
  }


  try {

    // DELETE FROM STORAGE

    const { error: storageError } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .remove([
          photo.storage_path
        ]);


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


    // DELETE DATABASE RECORD

    const { error: databaseError } =
      await supabaseClient
        .from("photos")
        .delete()
        .eq(
          "id",
          photo.id
        );


    if (databaseError) {

      console.error(
        "Database delete error:",
        databaseError
      );

      showMessage(
        "Database cleanup failed.",
        true
      );

      return;
    }


    showMessage(
      "Photo deleted."
    );

    await loadPhotos();

  } catch (error) {

    console.error(
      "Delete error:",
      error
    );

    showMessage(
      "Could not delete photo.",
      true
    );
  }
}


// =====================================================
// PHOTO VIEWER
// =====================================================

function openViewer(imageUrl) {
  viewerImage.src = imageUrl;
  viewer.style.display = "flex";
}


function closeViewer() {
  viewer.style.display = "none";
  viewerImage.src = "";
}


viewerClose.addEventListener(
  "click",
  closeViewer
);


viewer.addEventListener(
  "click",
  function (event) {

    if (event.target === viewer) {
      closeViewer();
    }

  }
);


// =====================================================
// LOCK GALLERY
// =====================================================

lockButton.addEventListener(
  "click",
  async function () {

    await supabaseClient.auth.signOut();

    closeViewer();

    showLogin();
  }
);


// =====================================================
// MESSAGE
// =====================================================

function showMessage(
  text,
  isError = false
) {

  message.textContent = text;

  message.className =
    isError
      ? "message error"
      : "message success";

}
```
