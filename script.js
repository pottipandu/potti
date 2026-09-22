/* =========================================================
   PRIVATE PHOTO GALLERY
   ========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
   =========================================================

   IMPORTANT:

   SUPABASE_URL must be your API Project URL.

   Example:

   https://abcdefghijklmnop.supabase.co

   NOT:

   https://supabase.com/dashboard/project/...

   ========================================================= */

const SUPABASE_URL =
  "https://wfhyyzoxknvdpfyxxmbp.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";

const GALLERY_EMAIL =
  "taara510p@gmail.com";


/* =========================================================
   SUPABASE CLIENT
   ========================================================= */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


/* =========================================================
   SETTINGS
   ========================================================= */

const BUCKET_NAME =
  "private-gallery";


const SIGNED_URL_SECONDS =
  3600;


/* =========================================================
   VARIABLES
   ========================================================= */

let enteredPin = "";

let currentPhotos = [];


/* =========================================================
   DOM ELEMENTS
   ========================================================= */

let pinInput;
let unlockButton;
let loginMessage;

let loginScreen;
let galleryScreen;

let photoInput;
let photoGrid;
let emptyGallery;

let uploadMessage;

let viewer;
let viewerImage;


/* =========================================================
   PAGE INITIALIZATION
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log("Private Gallery starting...");

    pinInput =
      document.getElementById("pinInput");

    unlockButton =
      document.getElementById("unlockButton");

    loginMessage =
      document.getElementById("loginMessage");

    loginScreen =
      document.getElementById("loginScreen");

    galleryScreen =
      document.getElementById("galleryScreen");

    photoInput =
      document.getElementById("photoInput");

    photoGrid =
      document.getElementById("photoGrid");

    emptyGallery =
      document.getElementById("emptyGallery");

    uploadMessage =
      document.getElementById("uploadMessage");

    viewer =
      document.getElementById("viewer");

    viewerImage =
      document.getElementById("viewerImage");


    /* PIN input */

    if (pinInput) {

      pinInput.addEventListener(
        "input",
        () => {

          enteredPin =
            pinInput.value;

        }
      );

      pinInput.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter"
          ) {

            event.preventDefault();

            unlockGallery();

          }

        }
      );

    }


    /* Photo upload */

    if (photoInput) {

      photoInput.addEventListener(
        "change",
        handlePhotoUpload
      );

    }


    /* Check existing session */

    try {

      const {
        data,
        error
      } =
        await supabaseClient.auth.getSession();


      if (error) {

        console.error(
          "Session error:",
          error
        );

        showLogin();

        return;

      }


      if (data && data.session) {

        console.log(
          "Existing session found."
        );

        showGallery();

      } else {

        console.log(
          "No active session."
        );

        showLogin();

      }

    } catch (error) {

      console.error(
        "Startup error:",
        error
      );

      showLogin();

    }

  }
);


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {

  if (loginScreen) {

    loginScreen.classList.remove(
      "hidden"
    );

  }

  if (galleryScreen) {

    galleryScreen.classList.add(
      "hidden"
    );

  }

  if (pinInput) {

    setTimeout(
      () => pinInput.focus(),
      100
    );

  }

}


/* =========================================================
   SHOW GALLERY
   ========================================================= */

async function showGallery() {

  if (loginScreen) {

    loginScreen.classList.add(
      "hidden"
    );

  }

  if (galleryScreen) {

    galleryScreen.classList.remove(
      "hidden"
    );

  }

  await loadPhotos();

}


/* =========================================================
   LOGIN
   ========================================================= */

async function unlockGallery() {

  if (!pinInput) {

    console.error(
      "PIN input not found."
    );

    return;

  }


  enteredPin =
    pinInput.value;


  if (!enteredPin) {

    showMessage(
      "Please enter your password.",
      true
    );

    return;

  }


  console.log(
    "Starting authentication..."
  );


  showMessage(
    "Checking..."
  );


  if (unlockButton) {

    unlockButton.disabled = true;

    unlockButton.textContent =
      "Checking...";

  }


  try {

    /*
      Timeout prevents the page from staying
      on "Checking..." forever.
    */

    const loginPromise =
      supabaseClient.auth.signInWithPassword(
        {
          email:
            GALLERY_EMAIL,

          password:
            enteredPin
        }
      );


    const timeoutPromise =
      new Promise(
        (_, reject) => {

          setTimeout(
            () => {

              reject(
                new Error(
                  "Authentication request timed out."
                )
              );

            },
            10000
          );

        }
      );


    const {
      data,
      error
    } =
      await Promise.race(
        [
          loginPromise,
          timeoutPromise
        ]
      );


    console.log(
      "Authentication response:",
      data,
      error
    );


    if (error) {

      console.error(
        "Authentication error:",
        error
      );

      showMessage(
        "Incorrect password.",
        true
      );

      return;

    }


    if (
      data &&
      data.session
    ) {

      console.log(
        "Login successful!"
      );


      enteredPin = "";


      if (pinInput) {

        pinInput.value = "";

      }


      showMessage("");


      showGallery();


      return;

    }


    console.error(
      "Authentication succeeded but no session was returned."
    );


    showMessage(
      "Login failed. Please try again.",
      true
    );


  } catch (error) {

    console.error(
      "Login request failed:",
      error
    );


    if (
      error.message ===
      "Authentication request timed out."
    ) {

      showMessage(
        "Connection timed out. Please try again.",
        true
      );

    } else {

      showMessage(
        "Unable to connect to the gallery.",
        true
      );

    }

  } finally {

    if (unlockButton) {

      unlockButton.disabled =
        false;

      unlockButton.textContent =
        "Unlock Gallery";

    }

  }

}


/* =========================================================
   MESSAGE
   ========================================================= */

function showMessage(
  message,
  isError = false
) {

  if (!loginMessage) {

    return;

  }


  loginMessage.textContent =
    message;


  if (isError) {

    loginMessage.style.color =
      "#ffb4b4";

  } else {

    loginMessage.style.color =
      "rgba(255,255,255,0.8)";

  }

}


/* =========================================================
   UPLOAD MESSAGE
   ========================================================= */

function showUploadMessage(
  message,
  isError = false
) {

  if (!uploadMessage) {

    return;

  }


  uploadMessage.textContent =
    message;


  if (isError) {

    uploadMessage.style.color =
      "#ffb4b4";

  } else {

    uploadMessage.style.color =
      "rgba(255,255,255,0.8)";

  }

}


/* =========================================================
   LOAD PHOTOS
   ========================================================= */

async function loadPhotos() {

  console.log(
    "Loading photos..."
  );


  if (photoGrid) {

    photoGrid.innerHTML = "";

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("photos")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {

      console.error(
        "Database error:",
        error
      );

      showEmptyGallery();

      return;

    }


    currentPhotos =
      data || [];


    if (
      currentPhotos.length === 0
    ) {

      showEmptyGallery();

      return;

    }


    if (emptyGallery) {

      emptyGallery.classList.add(
        "hidden"
      );

    }


    for (
      const photo
      of currentPhotos
    ) {

      await createPhotoCard(
        photo
      );

    }


  } catch (error) {

    console.error(
      "Load photos error:",
      error
    );

    showEmptyGallery();

  }

}


/* =========================================================
   EMPTY GALLERY
   ========================================================= */

function showEmptyGallery() {

  if (emptyGallery) {

    emptyGallery.classList.remove(
      "hidden"
    );

  }

}
/* =========================================================
   UPLOAD PHOTOS
   ========================================================= */

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
      "Photos uploaded successfully."
    );

    event.target.value = "";

    await loadPhotos();

  } catch (error) {

    console.error(
      "Upload error:",
      error
    );

    showUploadMessage(
      "Upload failed.",
      true
    );

  }

}
/* =========================================================
   CREATE PHOTO / VIDEO CARD
   ========================================================= */

async function createPhotoCard(photo) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          photo.storage_path,
          SIGNED_URL_SECONDS
        );

    if (error) {

      console.error(
        "Signed URL error:",
        error
      );

      return;

    }

    if (
      !data ||
      !data.signedUrl
    ) {

      return;

    }

    const card =
      document.createElement("div");

    card.className =
      "photo-card";


    /* -------------------------------------------------------
       FILE TYPE
       ------------------------------------------------------- */

    const fileName =
      photo.file_name ||
      photo.storage_path ||
      "";

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


    /* -------------------------------------------------------
       IMAGE
       ------------------------------------------------------- */

    if (
      imageExtensions.includes(extension)
    ) {

      const image =
        document.createElement("img");

      image.src =
        data.signedUrl;

      image.alt =
        photo.caption ||
        photo.file_name ||
        "Private photo";

      image.loading =
        "lazy";

      image.addEventListener(
        "click",
        () => {

          openViewer(
            data.signedUrl,
            "image"
          );

        }
      );

      card.appendChild(image);

    }


    /* -------------------------------------------------------
       VIDEO
       ------------------------------------------------------- */

    else if (
      videoExtensions.includes(extension)
    ) {

      const video =
        document.createElement("video");

      video.src =
        data.signedUrl;

      video.controls =
        true;

      video.preload =
        "metadata";

      video.playsInline =
        true;

      video.addEventListener(
        "click",
        (event) => {

          event.stopPropagation();

          openViewer(
            data.signedUrl,
            "video"
          );

        }
      );

      card.appendChild(video);

    }


    /* -------------------------------------------------------
       HEIC / HEIF
       ------------------------------------------------------- */

    else if (
      heicExtensions.includes(extension)
    ) {

      const heicBox =
        document.createElement("div");

      heicBox.className =
        "unsupported-file";


      const icon =
        document.createElement("div");

      icon.textContent =
        "📷";


      const title =
        document.createElement("strong");

      title.textContent =
        "HEIC Photo";


      const download =
        document.createElement("a");

      download.href =
        data.signedUrl;

      download.textContent =
        "Open / Download";

      download.target =
        "_blank";

      download.rel =
        "noopener";


      heicBox.appendChild(icon);
      heicBox.appendChild(title);
      heicBox.appendChild(download);

      card.appendChild(
        heicBox
      );

    }


    /* -------------------------------------------------------
       OTHER FILE
       ------------------------------------------------------- */

    else {

      const fileBox =
        document.createElement("div");

      fileBox.className =
        "unsupported-file";


      const icon =
        document.createElement("div");

      icon.textContent =
        "📁";


      const title =
        document.createElement("strong");

      title.textContent =
        photo.file_name ||
        "File";


      const open =
        document.createElement("a");

      open.href =
        data.signedUrl;

      open.textContent =
        "Open file";

      open.target =
        "_blank";

      open.rel =
        "noopener";


      fileBox.appendChild(icon);
      fileBox.appendChild(title);
      fileBox.appendChild(open);

      card.appendChild(
        fileBox
      );

    }


    /* -------------------------------------------------------
       DELETE BUTTON
       ------------------------------------------------------- */

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "delete-button";

    deleteButton.innerHTML =
      "×";

    deleteButton.title =
      "Delete file";


    deleteButton.addEventListener(
      "click",
      async (event) => {

        event.stopPropagation();

        await deletePhoto(
          photo
        );

      }
    );


    card.appendChild(
      deleteButton
    );


    if (photoGrid) {

      photoGrid.appendChild(
        card
      );

    }

  } catch (error) {

    console.error(
      "File card error:",
      error
    );

  }

}

/* =========================================================
   OPEN VIEWER
   ========================================================= */

function openViewer(
  fileUrl,
  type = "image"
) {

  if (!viewer) {
    return;
  }


  viewer.innerHTML = "";


  const closeButton =
    document.createElement("button");

  closeButton.className =
    "viewer-close";

  closeButton.textContent =
    "×";

  closeButton.addEventListener(
    "click",
    closeViewer
  );


  viewer.appendChild(
    closeButton
  );


  if (type === "video") {

    const video =
      document.createElement("video");

    video.src =
      fileUrl;

    video.controls =
      true;

    video.autoplay =
      true;

    video.playsInline =
      true;

    video.className =
      "viewer-media";

    viewer.appendChild(
      video
    );

  } else {

    const image =
      document.createElement("img");

    image.src =
      fileUrl;

    image.className =
      "viewer-media";

    image.alt =
      "Private photo";

    viewer.appendChild(
      image
    );

  }


  viewer.classList.remove(
    "hidden"
  );


  document.body.style.overflow =
    "hidden";

}
/* =========================================================
   CLOSE VIEWER
   ========================================================= */

function closeViewer() {

  if (!viewer) {
    return;
  }


  viewer.classList.add(
    "hidden"
  );


  viewer.innerHTML =
    "";


  document.body.style.overflow =
    "";

}
/* =========================================================
   LOCK GALLERY
   ========================================================= */

async function lockGallery() {

  console.log(
    "Locking gallery..."
  );


  try {

    const {
      error
    } =
      await supabaseClient.auth.signOut();


    if (error) {

      console.error(
        "Sign out error:",
        error
      );

    }

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  }


  currentPhotos = [];

  enteredPin = "";


  if (pinInput) {

    pinInput.value = "";

  }


  if (photoGrid) {

    photoGrid.innerHTML = "";

  }


  if (emptyGallery) {

    emptyGallery.classList.remove(
      "hidden"
    );

  }


  showLogin();

}


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape"
    ) {

      closeViewer();

    }

  }
);
