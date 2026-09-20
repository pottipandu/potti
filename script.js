// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const SUPABASE_URL = "https://supabase.com/dashboard/project/wfhyyzoxknvdpfyxxmbp";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_1uO-Uv8FdiI3ol2gXZlOrQ_WnRSt1x0";

// This is the email of the Supabase Auth user you created.
// The PIN/password is NOT written here.
const GALLERY_EMAIL = "taara510p@gmail.com";


const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);


// =====================================================
// SETTINGS
// =====================================================

const BUCKET_NAME = "private-gallery";

let enteredPin = "";


// =====================================================
// PAGE START
// =====================================================

document.addEventListener("DOMContentLoaded", async () => {

  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    showGallery();
  } else {
    showLogin();
  }

});


// =====================================================
// PIN KEYPAD
// =====================================================

function pressPin(number) {

  // Maximum 6 digits
  if (enteredPin.length >= 6) {
    return;
  }

  enteredPin += number;

  updatePinDots();

  clearError();
}


function deletePin() {

  enteredPin = enteredPin.slice(0, -1);

  updatePinDots();

  clearError();
}


function updatePinDots() {

  const dots = document.querySelectorAll("#pinDots span");

  dots.forEach((dot, index) => {

    if (index < enteredPin.length) {
      dot.classList.add("filled");
    } else {
      dot.classList.remove("filled");
    }

  });

}


// =====================================================
// PIN LOGIN
// =====================================================

async function unlockGallery() {

  if (!enteredPin) {
    showError("Please enter your PIN.");
    return;
  }

  const button = document.getElementById("unlockButton");

  button.disabled = true;
  button.textContent = "Checking...";

  const { data, error } =
    await supabaseClient.auth.signInWithPassword({
      email: GALLERY_EMAIL,
      password: enteredPin
    });

  button.disabled = false;
  button.textContent = "Unlock Gallery";

  if (error) {

    showError("Incorrect PIN.");

    enteredPin = "";
    updatePinDots();

    return;
  }

  enteredPin = "";
  updatePinDots();

  showGallery();

  await loadPhotos();
}


// =====================================================
// SHOW LOGIN
// =====================================================

function showLogin() {

  document.getElementById("loginScreen")
    .classList.remove("hidden");

  document.getElementById("galleryScreen")
    .classList.add("hidden");
}


// =====================================================
// SHOW GALLERY
// =====================================================

function showGallery() {

  document.getElementById("loginScreen")
    .classList.add("hidden");

  document.getElementById("galleryScreen")
    .classList.remove("hidden");

}


// =====================================================
// LOAD PHOTOS
// =====================================================

async function loadPhotos() {

  const gallery = document.getElementById("gallery");

  gallery.innerHTML = "";

  const { data: photos, error } =
    await supabaseClient
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });


  if (error) {

    console.error(error);

    gallery.innerHTML =
      "<p>Unable to load gallery.</p>";

    return;
  }


  if (!photos || photos.length === 0) {

    document.getElementById("emptyGallery")
      .classList.remove("hidden");

    return;
  }


  document.getElementById("emptyGallery")
    .classList.add("hidden");


  for (const photo of photos) {

    await createPhotoCard(photo);

  }

}


// =====================================================
// CREATE PHOTO CARD
// =====================================================

async function createPhotoCard(photo) {

  const gallery = document.getElementById("gallery");

  // Create temporary authorized URL
  const { data, error } =
    await supabaseClient.storage
      .from(BUCKET_NAME)
      .createSignedUrl(photo.storage_path, 3600);


  if (error) {

    console.error("Unable to create photo URL:", error);

    return;
  }


  const card = document.createElement("div");

  card.className = "photo-card";


  const image = document.createElement("img");

  image.src = data.signedUrl;

  image.alt = photo.caption || photo.file_name;

  image.onclick = () => {
    openViewer(data.signedUrl);
  };


  const deleteButton = document.createElement("button");

  deleteButton.className = "delete-photo";

  deleteButton.textContent = "×";

  deleteButton.onclick = async (event) => {

    event.stopPropagation();

    await deletePhoto(photo);

  };


  card.appendChild(image);
  card.appendChild(deleteButton);

  gallery.appendChild(card);

}


// =====================================================
// UPLOAD PHOTOS
// =====================================================

async function uploadPhotos(event) {

  const files = event.target.files;

  if (!files || files.length === 0) {
    return;
  }


  const { data: sessionData } =
    await supabaseClient.auth.getSession();


  if (!sessionData.session) {

    showLogin();

    return;
  }


  for (const file of files) {

    try {

      const extension =
        file.name.split(".").pop();

      const uniqueName =
        `${crypto.randomUUID()}.${extension}`;

      const storagePath =
        `gallery/${uniqueName}`;


      // Upload actual file
      const { error: uploadError } =
        await supabaseClient.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file);


      if (uploadError) {
        throw uploadError;
      }


      // Save metadata
      const { error: databaseError } =
        await supabaseClient
          .from("photos")
          .insert({
            file_name: file.name,
            storage_path: storagePath,
            caption: file.name
          });


      if (databaseError) {

        // Remove uploaded file if metadata fails
        await supabaseClient.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);

        throw databaseError;
      }

    } catch (error) {

      console.error("Upload failed:", error);

      alert(`Could not upload ${file.name}`);

    }

  }


  event.target.value = "";

  await loadPhotos();

}


// =====================================================
// DELETE PHOTO
// =====================================================

async function deletePhoto(photo) {

  const confirmed =
    confirm("Delete this photo permanently?");

  if (!confirmed) {
    return;
  }


  // Delete actual file
  const { error: storageError } =
    await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([photo.storage_path]);


  if (storageError) {

    console.error(storageError);

    alert("Could not delete photo.");

    return;
  }


  // Delete database record
  const { error: databaseError } =
    await supabaseClient
      .from("photos")
      .delete()
      .eq("id", photo.id);


  if (databaseError) {

    console.error(databaseError);

    alert("Photo file deleted, but database record could not be removed.");

    return;
  }


  await loadPhotos();

}


// =====================================================
// PHOTO VIEWER
// =====================================================

function openViewer(url) {

  document.getElementById("viewerImage").src = url;

  document.getElementById("viewer")
    .classList.remove("hidden");

}


function closeViewer(event) {

  if (
    event &&
    event.target &&
    event.target.id === "viewerImage"
  ) {
    return;
  }

  document.getElementById("viewer")
    .classList.add("hidden");

  document.getElementById("viewerImage").src = "";

}


// =====================================================
// LOGOUT / LOCK
// =====================================================

async function logout() {

  await supabaseClient.auth.signOut();

  showLogin();

  enteredPin = "";

  updatePinDots();

}


// =====================================================
// ERRORS
// =====================================================

function showError(message) {

  document.getElementById("errorMessage")
    .textContent = message;

}


function clearError() {

  document.getElementById("errorMessage")
    .textContent = "";

}