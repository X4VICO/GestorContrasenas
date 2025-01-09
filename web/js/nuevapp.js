// Importamos las dependencias necesarias
import { db, auth } from './firebase.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { collection, addDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// Variable global para almacenar el usuario autenticado
let authenticatedUser = null;

// ---------------------VERIFICACIÓN DE USUARIO---------------------
// verificamos si el usuario esta autentificado en nuestra base de datos. De no estarlo, se le manda directamente a "iniciosesion.html"
window.onload = function () {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "iniciosesion.html";
    } else {
      authenticatedUser = user;

      // una vez verificado, guardamos el nombre del usuario para mostrarlo en la página, arriba a la izquierda
      const userName = user.displayName || "Usuario";
      const userNameElement = document.getElementById("user-name");
      if (userNameElement) {
        userNameElement.textContent = userName;
      }

      // antes de mostrar la información de la aplicación, llamamos a una función que verificará la llave maestra del usuario
      try {
        await cargarClaveMaestra(authenticatedUser.uid);
      } catch {}
    }
  });
};

// ---------------------CERRAR SESIÓN---------------------
// cuando el botón de cerrar sesión sea pulsado, se ejecutará el cierre de sesión con una función de firebase hacia el usuario actual
// una vez cerrada la sesión, se mandará al iniciosesión, dejando la variable de usuario autentificado vacía
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
async function cargarClaveMaestra() {

  const masterKey = sessionStorage.getItem("userMasterKey");
  const encryptionKey = masterKey;

  return encryptionKey;
}


// ---------------------------------------------FORMULARIO AÑADIR APP------------------------------------------
//Usamos funciones y elementos predefinidas del DOM
//y guardamos variables
document.addEventListener("DOMContentLoaded", () => {
  const togglePassword = document.querySelector("#togglePassword");
  const passwordInput = document.querySelector("#password");

  //Al hacer click en los emoticonos, variamos el interior del input
  //si esta en asteriscos los mostramos en texto plano y viceversa
  togglePassword?.addEventListener("click", function () {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    //Cuando cambia lo de dentro el input, cambia tambien el emoji asociado
    this.textContent = type === "password" ? "👁️" : "🙈";
  });

  //Guardamos la contraseña
  const saveBtn = document.getElementById("saveBtn");

  //Al hacer click evitamos el comportamiento predeterminado
  saveBtn?.addEventListener("click", async (event) => {
    event.preventDefault();

    //Asignamos nuevas variables, evitando posibles errores de null y parecidos
    const appName = document.getElementById("nombreApp")?.value.trim();
    const urlValue = document.getElementById("urlApp")?.value.trim();
    const userValue = document.getElementById("user")?.value.trim();
    const passwordValue = passwordInput?.value.trim();
    const commentValue = document.getElementById("comment")?.value.trim();

    //Estos campos son obligatorios, advertimos al usuario
    if (!appName || !userValue || !passwordValue) {
      alert("Por favor, completa los campos obligatorios: Nombre de la aplicación, Usuario y Contraseña.");
      return;
    }

    //Tratamos la encriptacion de las claves
    try {
      const encryptionKey = await getEncryptionKey();
      const { encrypted, iv } = await encryptPassword(passwordValue, encryptionKey);
      //Asignamos todos los inputs a otra variable, para tratarlos todos en comun
      const appData = {
        appName,
        appUrl: urlValue || null,
        appUser: userValue,
        appContra: encrypted,
        iv: bufferToHex(iv),
        comment: commentValue || null,
      };

      //Lo guardamos en nuestra base de datos de firestore database
      await addDoc(collection(db, "USUARIOS", authenticatedUser.uid, "APP"), appData);
      alert("¡Aplicación guardada con éxito!");
      window.location.href = "llavero.html";
    } catch{}
  });
});

// ---------------------------------GENERAR CONTRASEÑA--------------------
document.getElementById('generate')?.addEventListener('click', generatePassword);
//Generamos una contraseña aleatoria, con los siguientes caracteres y de minimo 16
//Asignamos variables
function generatePassword() {
  const length = 16;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?¿~';
  let password = '';

  //Hacemos el random
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    password += chars[randomIndex];
  }

  //Asignamos el resultado al input de password
  document.getElementById('password').value = password;
}

// --------------------CIFRAMOS LA CONTRASEÑA--------------------------------
//Hacemos el cifrado en AES-GCM
async function encryptPassword(password, encryptionKey) {
  const encoder = new TextEncoder();
    //Convertimos la contraseña en un formato adecuado para el cifrado y generamos un vector de inicio aleatorio
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    //Usamos la clave
    encryptionKey,
    encoder.encode(password)
  );
  //Devuelve una contraseña cifrada convertida a un formato hexadecimal y el vector de inicialización
  return { encrypted: bufferToHex(encryptedContent), iv };
}


// --------------------CONVERSION DE BUFFER A HEX--------------------------------
//Funcion util para almacenar y mostrar los datos binarios, en formato legible
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// --------------------OBTENER CLAVE DE CIFRADO--------------------------------
async function getEncryptionKey() {
  // Recupera la llave maestra de sessionStorage
  const masterKey = sessionStorage.getItem("userMasterKey");
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(masterKey);
  
  // Deriva la clave base usando PBKDF2 a partir de la llave maestra.
  const derivedKey = await crypto.subtle.importKey(
    "raw", keyMaterial,
    { name: "PBKDF2" },
    false, 
    ["deriveKey"]
  );

  //Derivamos una nueva clave AES dea partir de la clave base
  //se utiliza PBKDF2 con parámetros adicionales como la sal
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode("fixed-salt"), 
      iterations: 100000,
      hash: "SHA-256"  // Utilizamos SHA-256 para el hash.
    },
    derivedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}