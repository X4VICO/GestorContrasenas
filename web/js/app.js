// Importamos las dependencias necesarias.
import { doc, getDoc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";


// Variable global para almacenar el usuario autenticado.
let authenticatedUser = null;

// ---------------------VERIFICACIÓN DE USUARIO---------------------
// verificamos si el usuario esta autentificado en nuestra base de datos. De no estarlo, se le manda directamente a "iniciosesion.html".
window.onload = function () {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "iniciosesion.html";
    } else {
      authenticatedUser = user;

      // una vez verificado, guardamos el nombre del usuario para mostrarlo en la página, arriba a la izquierda.
      const userName = user.displayName || "Usuario";
      const userNameElement = document.getElementById("user-name");
      if (userNameElement) {
        userNameElement.textContent = userName;
      }

      // antes de mostrar la información de la aplicación, llamamos a una función que verificará la llave maestra del usuario.
      try {
        await cargarClaveMaestra(authenticatedUser.uid);
        cargarDatosApp();
      } catch {}
    }
  });
};

// ---------------------CERRAR SESIÓN---------------------
// cuando el botón de cerrar sesión sea pulsado, se ejecutará el cierre de sesión con una función de firebase hacia el usuario actual.
// una vez cerrada la sesión, se mandará al iniciosesión, dejando la variable de usuario autentificado vacía.
document.getElementById("logout-button")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "index.html";
    authenticatedUser = null;
    sessionStorage.removeItem("userMasterKey");
  } catch {}
});

// ---------------------FUNCIONES DE CLAVE MAESTRA---------------------
// función que verifica si la llave maestra se ha introducido correctamente.
// cuando obtengamos la llave maestra, la guardamos para usarla posteriormente como clave para descifrar las claves de las aplicaciones.
async function cargarClaveMaestra(userId) {
  try {
      
    const masterKey = await requestMasterKey();
    const docRef = doc(db, "USUARIOS", authenticatedUser.uid);
    const docSnap = await getDoc(docRef);


    const salt = docSnap.data().salt;
    const localmasterKey = sessionStorage.getItem("userMasterKey");
    const derivedKey = await deriveKey(masterKey, salt);

    const derivedKeyHex = bufferToHex(await crypto.subtle.exportKey("raw", derivedKey));

    if (derivedKeyHex !== localmasterKey) {
      alert("Llave maestra incorrecta.");
      window.location.href = "llavero.html";
    }

    return derivedKey;

  } catch {}
}

// -------------------PEDIR LLAVE MAESTRA-------------------
// con esta función creamos una ventana emergente donde el usuario introducirá su llave maestra.
// en caso de no introducir nada se mostrará una alerta.
// una vez introducida, se guarda la llave que se verificará más adelante cuando se cargen los datos de la aplicación
function requestMasterKey() {
  return new Promise((resolve) => {
    const modal = document.getElementById("masterKeyModal");
    const input = document.getElementById("masterKeyInput");
    const button = document.getElementById("submitMasterKey");

    modal.style.display = "flex";

    button.addEventListener("click", () => {
      const masterKey = input.value;
      if (!masterKey) {
        alert("Por favor, introduce tu llave maestra.");
        return;
      }
      modal.style.display = "none";
      resolve(masterKey);
    });
  });
}

async function deriveKey(masterKey, salt) {
  try {

    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(masterKey);

    const saltBuffer = hexToBuffer(salt);

    const rawKey = await crypto.subtle.importKey(
      "raw",
      keyMaterial,
      { name: "PBKDF2" },
      false,
      ["deriveBits", "deriveKey"]
    );

    // Cambiar extractable: true
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      rawKey,
      { name: "AES-GCM", length: 256 },
      true, // Aseguramos que la clave es exportable
      ["encrypt", "decrypt"]
    );

    return derivedKey;

  } catch {}
}


// -------------------CARGAR DATOS-------------------
// se cargan los datos de la aplicación seleccionada en el llavero.
async function cargarDatosApp() {
  const selectedAppId = sessionStorage.getItem("selectedAppId");

  try {
    const appDocRef = doc(db, "USUARIOS", authenticatedUser.uid, "APP", selectedAppId);
    const appSnapshot = await getDoc(appDocRef);

    if (!appSnapshot.exists()) {
      throw new Error("Aplicación no encontrada.");
    }

    const appData = appSnapshot.data();

    const masterKey = sessionStorage.getItem("userMasterKey");
    if (!masterKey) {
      throw new Error("Llave maestra no encontrada en la sesión.");
    }

    const encryptionKey = await getEncryptionKey(masterKey);

    const decryptedPassword = await decryptPassword(appData.appContra, appData.iv, encryptionKey);

    appData.appContra = decryptedPassword;
    actualizarDOM(appData);

  } catch {}
}


// si a la hora de cargar los datos no hay ningún error, pasamos la información de la aplicación a su sitio correspondiente.
function actualizarDOM(appData) {
  const campos = {
    "app-name": appData.appName || "Sin nombre",
    "app-URL": appData.appUrl || "",
    "user": appData.appUser || "Sin usuario",
    "password": appData.appContra || "Sin contraseña",
    "comment": appData.comment || ""
  };

  for (const [id, value] of Object.entries(campos)) {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.value = value;
    }
  }
}

// --------------------DESCIFRAR CONTRASEÑA-------------------
// cogemos la contraseña cifrada, el vector de inicialización y la llave de descifrado. 
async function decryptPassword(encryptedPassword, ivHex, encryptionKey) {
  const iv = hexToBuffer(ivHex); 
  const encryptedBuffer = hexToBuffer(encryptedPassword); 

  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    encryptionKey,
    encryptedBuffer
  );

  // devuelve la contraseña descifrada
  const decoder = new TextDecoder();
  return decoder.decode(decryptedContent);
}

// --------------------UTILIDAD PARA CONVERTIR HEX A BUFFER-------------------
function hexToBuffer(hex) {
  if (!hex || typeof hex !== "string") {
    console.error("Hex inválido:", hex);
    throw new Error("Formato Hex no válido.");
  }
  return Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// --------------------FUNCIÓN PARA OBTENER CLAVE DE DESCIFRADO-------------------
// generamos la clave de cifrado a partir de la llave maestra.
// usamos el algoritmo AES-GCM
async function getEncryptionKey(masterKey) {
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(masterKey);

  const derivedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("fixed-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    derivedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// -----------------------MOSTRAR CONTRASEÑA-----------------------------
// hacemos que cuando se pulse el ojo muestre u oculte el contenido de la contraseña.
document.addEventListener("DOMContentLoaded", () => {
  const togglePasswordButton = document.querySelector("#togglePasswordVisibility");
  const passwordInput = document.querySelector("#password");

  togglePasswordButton?.addEventListener("click", function () {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password"; 
    passwordInput.setAttribute("type", type); 

    const icon = togglePasswordButton.querySelector("i");
    icon.classList.toggle("bi-eye");  
    icon.classList.toggle("bi-eye-slash");
  });
});

// --------------------------ELIMINAR APP-----------------------------------
// funcionalidad para eliminar la aplicación de la base de datos.
async function eliminarAplicacion(appId) {
  try {
    const appDocRef = doc(db, "USUARIOS", authenticatedUser.uid, "APP", appId);

    await deleteDoc(appDocRef);
    
    alert("Aplicación eliminada con éxito.");
    window.location.href = "llavero.html"; 
  } catch {}
}

// si el usuario pulsa el botón de eliminar aplicación, llamamos a la función y mostramos mensaje de confirmación para completar la acción
document.getElementById("deleteAppButton")?.addEventListener("click", async () => {
  
  const selectedAppId = sessionStorage.getItem("selectedAppId");
  const confirmDelete = confirm("¿Estás seguro de que deseas eliminar esta aplicación?");
  if (confirmDelete) {
    await eliminarAplicacion(selectedAppId);
  }
});

// -------------------EDITAR-------------------
// funcionalidad para habilitar la edición de los campos de la aplicación.
// para diferenciar que el modo edición está activo, ponemos el fondo amarillento.
function habilitarEdicion() {
  const campos = ["app-name", "app-URL", "user", "password", "comment"];

  campos.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.readOnly = false; 
      campo.style.backgroundColor = "rgba(255, 253, 200)"; 
    }
  });

  const editButton = document.getElementById("editAppButton");
  // modificamos el texto del boton "Editar"
  if (editButton) {
    editButton.textContent = "Guardar cambios";
    editButton.removeEventListener("click", habilitarEdicion); 
    editButton.addEventListener("click", guardarCambios); 
  }
}

// cuando el usuario pulsa el botón editar llamamos a la función de edición.
document.getElementById("editAppButton")?.addEventListener("click", habilitarEdicion);

// -------------------GUARDAR CAMBIOS-------------------
// función que recogerá todos los campos de nuevo para guardar las modificaciones.
async function guardarCambios() {
  const selectedAppId = sessionStorage.getItem("selectedAppId");

  const appName = document.getElementById("app-name").value.trim();
  const appUrl = document.getElementById("app-URL").value.trim();
  const appUser = document.getElementById("user").value.trim();
  const appPassword = document.getElementById("password").value.trim();
  const appComment = document.getElementById("comment").value.trim();

  // nos aseguramos de que los campos obligatorios tengan información.
  if (!appName || !appUser || !appPassword) {
    alert("Por favor, completa los campos obligatorios: Nombre APP, Usuario y Contraseña.");
    return;
  }

  try {
    const masterKey = sessionStorage.getItem("userMasterKey");
    const encryptionKey = await getEncryptionKey(masterKey); 
    const { encrypted, iv } = await encryptPassword(appPassword, encryptionKey); 

    const updatedAppData = {
      appName,
      appUrl: appUrl || null, 
      appUser,
      appContra: encrypted,
      iv: bufferToHex(iv),
      comment: appComment || null,
    };

    const appDocRef = doc(db, "USUARIOS", authenticatedUser.uid, "APP", selectedAppId);
    await updateDoc(appDocRef, updatedAppData);

    alert("¡Aplicación actualizada con éxito!");
    window.location.href = "llavero.html";
  } catch {}
}

// -------------------CIFRAR CONTRASEÑA-------------------
// volvemos a usar el cifrado de la contraseña como hacemos al crear una nueva aplicación
async function encryptPassword(password, encryptionKey) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    encryptionKey,
    passwordBuffer
  );

  return {
    encrypted: bufferToHex(encryptedBuffer),
    iv: iv,
  };
}

// -------------------UTILIDAD PARA CONVERTIR BUFFER A HEX-------------------
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ------------------------FUNCION PORTAPAPELES----------------------------
// para que el portapapeles funcione, hacemos que según el portapapeles que se pulse, copie el contenido del input pertinente
document.addEventListener("DOMContentLoaded", () => {
  function copiarAlPortapapeles(inputId) {
    const inputElement = document.getElementById(inputId);
    if (!inputElement) {
      console.error(`Elemento con ID ${inputId} no encontrado.`);
      return;
    }

    inputElement.select();
    inputElement.setSelectionRange(0, 99999);

    try {
      document.execCommand("copy");
      alert(`¡Copiado al portapapeles!`);
    } catch (error) {
      console.error("Error al copiar al portapapeles:", error);
      alert("No se pudo copiar al portapapeles.");
    }
  }

  document.getElementById("copyUrl")?.addEventListener("click", () => copiarAlPortapapeles("app-URL"));
  document.getElementById("copyUser")?.addEventListener("click", () => copiarAlPortapapeles("user"));
  document.getElementById("copyPassword")?.addEventListener("click", () => copiarAlPortapapeles("password"));
});