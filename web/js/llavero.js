//Importamos las dependencias necesarias
import { db, auth } from './firebase.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { collection, doc, getDocs, getDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

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



      try {
        await cargarClaveMaestra(authenticatedUser.uid);
        await cargarApps();
      } catch{};

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

  const docRef = doc(db, "USUARIOS", authenticatedUser.uid);
  const docSnap = await getDoc(docRef);
  const masterKey = docSnap.data().masterKey;

  sessionStorage.setItem("userMasterKey", masterKey);
  return

}

// ---------------------------------CARGAR APPS--------------------
async function cargarApps() {
  const appList = document.getElementById("appList");
  try {
    const appsCollection = collection(db, "USUARIOS", authenticatedUser.uid, "APP");
    const querySnapshot = await getDocs(appsCollection);
    // Limpiamos contenido previo
    appList.innerHTML = ""; 

    //Si no hay apps en el llavero, mostramos un texto que avisa al usuario
    if (querySnapshot.empty) {
      appList.innerHTML = `<p class="text-center text-muted hidden-text">No tienes aplicaciones guardadas.</p>`;
      return;
    }

    //Asignamos los datos de la app a una id
    querySnapshot.forEach((doc) => {
      const app = doc.data();
      app.id = doc.id;
      const appElement = crearAppElement(app);
      appList.appendChild(appElement);
    });
  } catch {}
}

// ---------------------------------CREAMOS LOS ELEMENTOS DE LA APP--------------------
//Elementos de los que mostraremos los datos en en contenedor
function crearAppElement(app) {
  const template = document.getElementById("appTemplate")?.content.cloneNode(true);
  const appTitle = template.querySelector(".app-title");
  const appUrl = template.querySelector(".app-url");
  const appUser = template.querySelector(".app-user");
  const appComment = template.querySelector(".app-comment");

  // Si encontramos los elementos, asignamos los datos de la aplicación
  if (appTitle) appTitle.textContent = app.appName;
  if (appUrl) appUrl.textContent = app.appUrl || "";
  if (appUser) appUser.textContent = `Usuario: ${app.appUser}`;
  if (appComment) appComment.textContent = app.comment || "";

  //Boton de detalles, para poder consultarlos y manipularlos
  const detailsButton = template.querySelector("button");
  //Asignacion de id y redireccion, de los detalles
  if (detailsButton) {
    detailsButton.addEventListener("click", () => {
      sessionStorage.setItem("selectedAppId", app.id);
      console.log("ID de la app seleccionada:", app.id);
      window.location.href = "app.html";
    });
  } 
  return template;
}

