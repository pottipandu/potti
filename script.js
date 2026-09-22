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
   CREATE PHOTO CARD
   ========================================================= */

async function createPhotoCard(
  photo
) {

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
      document.createElement(
        "div"
      );


    card.className =
      "photo-card";


    const image =
      document.createElement(
        "img"
      );


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
          data.signedUrl
        );

      }
    );


    card.appendChild(
      image
    );


    const deleteButton =
      document.createElement(
        "button"
      );


    deleteButton.className =
      "delete-button";


    deleteButton.innerHTML =
      "×";


    deleteButton.title =
      "Delete photo";


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


    photoGrid.appendChild(
      card
    );


  } catch (error) {

    console.error(
      "Photo card error:",
      error
    );

  }

}


/* =========================================================
   UPLOAD PHOTOS
   ========================================================= */

async function handlePhotoUpload(
  event
) {

  const files =
    event.target.files;


  if (
    !files ||
    files.length === 0
  ) {

    return;

  }


  showUploadMessage(
    "Uploading..."
  );


  try {

    for (
      const file
      of files
    ) {

      await uploadPhoto(
        file
      );

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
   UPLOAD SINGLE PHOTO
   ========================================================= */

async function uploadPhoto(
  file
) {

  const timestamp =
    Date.now();


  const random =
    Math.random()
      .toString(36)
      .substring(2, 10);


  const safeName =
    file.name
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "_"
      );


  const storagePath =
    `${timestamp}_${random}_${safeName}`;


  console.log(
    "Uploading:",
    storagePath
  );


  const {
    error: uploadError
  } =
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

    throw uploadError;

  }


  const {
    error: databaseError
  } =
    await supabaseClient
      .from("photos")
      .insert(
        {
          file_name:
            file.name,

          storage_path:
            storagePath,

          caption:
            ""
        }
      );


  if (databaseError) {

    console.error(
      "Database insert error:",
      databaseError
    );


    /*
      If database insertion fails,
      remove the uploaded file so
      we don't leave an orphan file.
    */

    await supabaseClient
      .storage
      .from(BUCKET_NAME)
      .remove(
        [
          storagePath
        ]
      );


    throw databaseError;

  }

}


/* =========================================================
   DELETE PHOTO
   ========================================================= */

async function deletePhoto(
  photo
) {

  const confirmed =
    confirm(
      "Delete this photo?"
    );


  if (!confirmed) {

    return;

  }


  try {

    const {
      error: storageError
    } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .remove(
          [
            photo.storage_path
          ]
        );


    if (storageError) {

      console.error(
        "Storage delete error:",
        storageError
      );

      alert(
        "Could not delete the photo file."
      );

      return;

    }


    const {
      error: databaseError
    } =
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

      alert(
        "Photo file deleted, but database record could not be removed."
      );

      return;

    }


    await loadPhotos();


  } catch (error) {

    console.error(
      "Delete error:",
      error
    );

    alert(
      "Could not delete photo."
    );

  }

}


/* =========================================================
   PHOTO VIEWER
   ========================================================= */

function openViewer(
  imageUrl
) {

  if (!viewer || !viewerImage) {

    return;

  }


  viewerImage.src =
    imageUrl;


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


  if (viewerImage) {

    viewerImage.src = "";

  }


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
