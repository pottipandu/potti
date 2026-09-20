```javascript
/* =====================================================
   YOUR SUPABASE DETAILS
   =====================================================

   Replace ONLY these 3 values.

   Do NOT put your password here.
===================================================== */

const SUPABASE_URL =
  "https://supabase.com/dashboard/project/wfhyyzoxknvdpfyxxmbp";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";

const GALLERY_EMAIL =
  "taara510p@gmail.com";


/* =====================================================
   SUPABASE
===================================================== */

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );


const BUCKET_NAME =
  "private-gallery";


/* =====================================================
   ELEMENTS
===================================================== */

const loginScreen =
  document.getElementById("loginScreen");

const galleryScreen =
  document.getElementById("galleryScreen");

const loginForm =
  document.getElementById("loginForm");

const pinInput =
  document.getElementById("pinInput");

const message =
  document.getElementById("message");

const galleryGrid =
  document.getElementById("galleryGrid");

const emptyState =
  document.getElementById("emptyState");

const photoInput =
  document.getElementById("photoInput");

const emptyPhotoInput =
  document.getElementById("emptyPhotoInput");

const lockButton =
  document.getElementById("lockButton");

const viewer =
  document.getElementById("viewer");

const viewerImage =
  document.getElementById("viewerImage");

const viewerClose =
  document.getElementById("viewerClose");


/* =====================================================
   START
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    const {
      data,
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      console.error(error);

      showLogin();

      return;
    }


    if (data.session) {

      showGallery();

    } else {

      showLogin();

    }

  }
);


/* =====================================================
   LOGIN FORM
===================================================== */

loginForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    await unlockGallery();

  }
);


/* =====================================================
   UNLOCK
===================================================== */

async function unlockGallery() {

  const password =
    pinInput.value;


  if (!password) {

    showMessage(
      "Please enter your password.",
      true
    );

    return;
  }


  showMessage("Checking...");


  const {
    data,
    error
  } =
    await supabaseClient.auth
      .signInWithPassword({

        email:
          GALLERY_EMAIL,

        password:
          password

      });


  if (error) {

    console.error(
      "Supabase login error:",
      error
    );


    showMessage(
      "Incorrect PIN or password.",
      true
    );


    return;
  }


  if (data.session) {

    pinInput.value = "";

    showGallery();

  }

}


/* =====================================================
   SHOW LOGIN
===================================================== */

function showLogin() {

  loginScreen.style.display =
    "flex";

  galleryScreen.style.display =
    "none";


  pinInput.value = "";

  setTimeout(
    () => pinInput.focus(),
    100
  );

}


/* =====================================================
   SHOW GALLERY
===================================================== */

async function showGallery() {

  loginScreen.style.display =
    "none";

  galleryScreen.style.display =
    "block";


  await loadPhotos();

}


/* =====================================================
   LOAD PHOTOS
===================================================== */

async function loadPhotos() {

  galleryGrid.innerHTML = "";


  const {
    data: photos,
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
      "Photos database error:",
      error
    );


    showMessage(
      "Unable to load gallery.",
      true
    );


    return;

  }


  if (
    !photos ||
    photos.length === 0
  ) {

    emptyState.style.display =
      "block";

    return;

  }


  emptyState.style.display =
    "none";


  for (const photo of photos) {

    const {
      data: signedData,
      error: signedError
    } =
      await supabaseClient
        .storage
        .from(BUCKET_NAME)
        .createSignedUrl(
          photo.storage_path,
          3600
        );


    if (signedError) {

      console.error(
        "Signed URL error:",
        signedError
      );

      continue;

    }


    createPhotoCard(
      photo,
      signedData.signedUrl
    );

  }

}


/* =====================================================
   CREATE PHOTO CARD
===================================================== */

function createPhotoCard(
  photo,
  imageUrl
) {

  const card =
    document.createElement("div");

  card.className =
    "photo-card";


  const image =
    document.createElement("img");

  image.src =
    imageUrl;

  image.alt =
    photo.caption ||
    photo.file_name;

  image.loading =
    "lazy";


  image.addEventListener(
    "click",
    () => {

      openViewer(imageUrl);

    }
  );


  const info =
    document.createElement("div");

  info.className =
    "photo-info";


  const title =
    document.createElement("div");

  title.textContent =
    photo.caption ||
    photo.file_name;


  const deleteButton =
    document.createElement("button");

  deleteButton.type =
    "button";

  deleteButton.textContent =
    "Delete";


  deleteButton.addEventListener(
    "click",
    async () => {

      await deletePhoto(photo);

    }
  );


  info.appendChild(title);

  info.appendChild(
    deleteButton
  );


  card.appendChild(image);

  card.appendChild(info);


  galleryGrid.appendChild(card);

}


/* =====================================================
   HEADER UPLOAD
===================================================== */

photoInput.addEventListener(
  "change",
  async () => {

    const files =
      Array.from(
        photoInput.files || []
      );


    await uploadFiles(files);


    photoInput.value = "";

  }
);


/* =====================================================
   EMPTY STATE UPLOAD
===================================================== */

emptyPhotoInput.addEventListener(
  "change",
  async () => {

    const files =
      Array.from(
        emptyPhotoInput.files || []
      );


    await uploadFiles(files);


    emptyPhotoInput.value = "";

  }
);


/* =====================================================
   UPLOAD FILES
===================================================== */

async function uploadFiles(files) {

  if (!files.length) {
    return;
  }


  for (const file of files) {

    await uploadPhoto(file);

  }


  await loadPhotos();

}


/* =====================================================
   UPLOAD ONE PHOTO
===================================================== */

async function uploadPhoto(file) {

  if (
    !file.type.startsWith("image/")
  ) {

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
    `gallery/${crypto.randomUUID()}.${extension}`;


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
      "Upload error:",
      uploadError
    );


    showMessage(
      "Photo upload failed.",
      true
    );


    return;

  }


  const {
    error: databaseError
  } =
    await supabaseClient
      .from("photos")
      .insert({

        file_name:
          file.name,

        storage_path:
          storagePath,

        caption:
          ""

      });


  if (databaseError) {

    console.error(
      "Database error:",
      databaseError
    );


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
    "Photo added successfully.",
    false
  );

}


/* =====================================================
   DELETE PHOTO
===================================================== */

async function deletePhoto(photo) {

  const confirmed =
    window.confirm(
      `Delete "${photo.file_name}"?`
    );


  if (!confirmed) {
    return;
  }


  const {
    error: storageError
  } =
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


    showMessage(
      "Database cleanup failed.",
      true
    );


    return;

  }


  await loadPhotos();

}


/* =====================================================
   VIEWER
===================================================== */

function openViewer(imageUrl) {

  viewerImage.src =
    imageUrl;

  viewer.style.display =
    "flex";

}


function closeViewer() {

  viewer.style.display =
    "none";

  viewerImage.src =
    "";

}


viewerClose.addEventListener(
  "click",
  closeViewer
);


viewer.addEventListener(
  "click",
  (event) => {

    if (
      event.target === viewer
    ) {

      closeViewer();

    }

  }
);


/* =====================================================
   LOCK
===================================================== */

lockButton.addEventListener(
  "click",
  async () => {

    await supabaseClient
      .auth
      .signOut();


    closeViewer();

    showLogin();

  }
);


/* =====================================================
   MESSAGE
===================================================== */

function showMessage(
  text,
  isError = false
) {

  message.textContent =
    text;


  message.className =
    isError
      ? "message error"
      : "message";


  if (!isError) {

    message.classList.add(
      "success"
    );

  }


  setTimeout(
    () => {

      message.textContent =
        "";

      message.className =
        "message";

    },
    3000
  );

}
```
