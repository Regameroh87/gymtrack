import { supabase } from "../../database/supabase";
const handleVerifyCode = async ({ email, code }) => {
  // 1. Llamamos a Supabase para validar el código
  const { data, error } = await supabase.auth.verifyOtp({
    email: email, // El mail que ingresó en el paso anterior
    token: code,
    type: "email", // Importante: debe ser el mismo tipo que configuraste
  });

  if (error) {
    // Si el código expiró o es incorrecto
    console.error("Error de validación:", error.message);
    alert("Código inválido. Revisa tu correo de nuevo.");
  } else {
    // 2. ¡ÉXITO!
    // Supabase acaba de guardar la sesión en el AsyncStorage automáticamente.
    // data.session contiene el token y data.user los datos del usuario.
    console.log("Sesión iniciada correctamente", data.user.id);

    // NOTA: Si tienes el 'onAuthStateChange' en tu App.js o Contexto,
    // la app cambiará de pantalla sola ahora mismo.
  }
};

export default handleVerifyCode;
