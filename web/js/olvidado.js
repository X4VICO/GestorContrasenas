// Importamos las dependencias necesarias
import { getAuth, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";
import { db, auth } from "./firebase.js";

//------------FORMULARIO PARA LA RECUPERACION DE CONTRASEÑA-------------
//Evitamos el refresh del formulario si hay algun fallo, para que no elimine los datos introducidos
document.querySelector("form").addEventListener("submit", async (e) => {
    e.preventDefault();
    //Asignamos variables
    const emailInput = document.getElementById("email");
    const email = emailInput.value.trim();

    //Si falta el email alertamos al usuario
    if (!email) {
        alert("Por favor, introduce un correo electrónico.");
        return;
    }

    try {
        //Verificamos si el email existe en la base de datos
        const usersCollection = collection(db, "USUARIOS");
        const q = query(usersCollection, where("email", "==", email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            //Imprimimos el siguiente mensaje, para evitar posibles ataques
            //para que nadie sepa si el correo esta registrado o no
            emailInput.value = "";
            alert("Hemos enviado un correo con las instrucciones para restablecer tu contraseña, si no te ha llegado ningún mensaje, revisa que hayas escrito bien tu correo.");
            return;
        }

        // Enviamos el correo de restablecimiento utilizando firebase authentication, si el correo es correcto
        await sendPasswordResetEmail(auth, email);
        alert("Hemos enviado un correo con las instrucciones para restablecer tu contraseña.");
    } catch{}
});