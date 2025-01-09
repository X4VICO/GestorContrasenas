import { auth } from './firebase.js';  // Asegúrate de que `auth` esté exportado en firebase.js
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";

// Manejador para mostrar/ocultar la contraseña
document.getElementById('toggle-password').addEventListener('click', function () {
    var passwordInput = document.getElementById('password');
    var icon = this.querySelector('i');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text'; // Muestra la contraseña
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash'); // Cambia a ojo cerrado
    } else {
        passwordInput.type = 'password'; // Oculta la contraseña
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye'); // Cambia a ojo abierto
    }
});



// Selecciona el formulario
const loginForm = document.querySelector("form.my-login-validation");

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault(); // Evita la recarga de la página al enviar el formulario

    // Obtiene los valores de los campos de email y contraseña
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    try {
        // Intenta iniciar sesión con el email y contraseña proporcionados
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const userData = {
            nombre: user.displayName || "Usuario", // Si `displayName` no está configurado, usa "Usuario"
            email: user.email,
            uid: user.uid
        };

  

        // Guardamos el usuario en localStorage
        localStorage.setItem("user", JSON.stringify(userData));
        console.log("Usuario autenticado:", userData.nombre);

        // Redirige al usuario a la página de inicio si el inicio de sesión es exitoso
        window.location.href = "llavero.html"; // Cambia la URL a la página de inicio de tu aplicación
    } catch (error) {
        // Muestra un mensaje de error si hay un problema al iniciar sesión
        console.error("Error en el inicio de sesión");
        alert("Error en el inicio de sesión ");
    }
});