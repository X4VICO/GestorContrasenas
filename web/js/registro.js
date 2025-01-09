// Importamos las dependencias necesarias
import { db, auth } from './firebase.js';
import { createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";


// --------------------FUNCION MOSTRAR/OCULTAR CONTRASEÑA--------------------------------
// Hacemos la funcion que cuando se pulse el icono del ojo, muestre o oculte el texto
function visibilidadcontra(toggleId, inputId) {
    document.getElementById(toggleId).addEventListener('click', function () {
        var passwordInput = document.getElementById(inputId);
        var icon = this.querySelector('i');
        //Si el input esta oculto, al pulsar el ojo nos mostrara la contraseña
        //y cambiara el icono, de ojo a ojo con slash
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            //Ocultamos la contraseña y cambiamos el icono
            //del ojo con slash al ojo abierto
            passwordInput.type = 'password'; 
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
}

//Llamadas a la funcion, creada anteriormente
visibilidadcontra('toggle-password', 'password');
visibilidadcontra('toggle-confirmPassword', 'confirmPassword');
visibilidadcontra('toggle-masterKey', 'masterKey');
visibilidadcontra('toggle-confirmMasterKey', 'confirmMasterKey');


// --------------------FORMULARIO GENERAL--------------------------------
// Esperamos al envio del formulario y evitamos que si el registro falla, la pagina se recargue y borre los datos introducidos
const registro = document.getElementById("registroForm");
registro.addEventListener("submit", (e) => {
    e.preventDefault();

    //Cojemos los elementos que necesitaremos en este js, y los guardamos en las variables que usaremos
    const nombreInput = document.getElementById("nombre");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const masterKeyInput = document.getElementById("masterKey");
    const confirmMasterKeyInput = document.getElementById("confirmMasterKey");

    // Eliminamos las posibles clases de validación anteriores
    [nombreInput, emailInput, passwordInput, confirmPasswordInput, masterKeyInput, confirmMasterKeyInput].forEach(input => {
        input.classList.remove("is-invalid");
    });

    // -------------------VALIDACIONES----------------
    let isValid = true;
    // Validar nombre
    if (!nombreInput.value.trim()) {
        nombreInput.classList.add("is-invalid");
        isValid = false;
    }
    // Validar email
    if (!emailInput.value.includes("@")) {
        emailInput.classList.add("is-invalid");
        isValid = false;
    }
    // Validar contraseña y la confirmacion de esta
    if (passwordInput.value.length < 16) {
        passwordInput.classList.add("is-invalid");
        isValid = false;
    }
    if (passwordInput.value !== confirmPasswordInput.value) {
        confirmPasswordInput.classList.add("is-invalid");
        isValid = false;
    }
    // Validar llave maestra y la confirmacion de esta
    if (masterKeyInput.value.length < 18) {
        masterKeyInput.classList.add("is-invalid");
        isValid = false;
    }
    if (masterKeyInput.value !== confirmMasterKeyInput.value) {
        confirmMasterKeyInput.classList.add("is-invalid");
        isValid = false;
    }
    // Si todas las validaciones son correctas, registramos al usuario
    if (isValid) {
        registrarUsuario(
            emailInput.value,
            passwordInput.value,
            nombreInput.value,
            masterKeyInput.value
        );
    }
});


// --------------------REGISTRO DE USUARIO--------------------------------
async function registrarUsuario(email, password, nombre, masterKey) {
    try {
        // Usando una funcion que importamos de firebase, registramos al usuario
        // con su email y contraseña, que mas tarde se usaran para los login
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Añadimos el displayName del usuario, para usarlo en firebase authentication
        await updateProfile(user, { displayName: nombre });

        const { hash: masterKeyHash, salt } = await hashPassword(masterKey);
        // Guardamos el nombre, el email y la masterkey de manera cifrada
        // asi conseguimos que no solo viaje encriptado, sino que tambien viaje cifrado
        await setDoc(doc(db, "USUARIOS", user.uid), {
            nombre: nombre,
            email: email,
            masterKey: masterKeyHash,
            salt: salt 
        });

        //Avisamos al usuario de que el registro ha sido exitoso
        alert("¡Registro exitoso!");

        //Y cargamos la pantalla de inicio de sesion.
        window.location.href = "iniciosesion.html";
    } catch {}
}

// --------------------CIFRADO DE LA LLAVE MAESTRA--------------------------------
// Generamos las funciones y creamos el salt, para el hash
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Importamos unc clave criptográfica a partir de una contraseña 
    // para usarla con el algoritmo de cifrado PBKDF2
    const passwordKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );

    // Se deriva una clave segura usando PBKDF2 con una salt
    //para luego usarla en cifrado AES-GCM de 256 bits.
    const key = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256"
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt"]
    );

    // Exporta la clave derivada en formato raw
    const hashBuffer = await crypto.subtle.exportKey("raw", key);

    // Preparamos el decifrado de la contraseña
    return {
        hash: bufferToHex(hashBuffer),
        salt: bufferToHex(salt)
    };
}

// Convierte un buffer a una cadena hexadecimal
function bufferToHex(buffer) {
    return [...new Uint8Array(buffer)]
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}