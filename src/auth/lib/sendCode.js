import { supabase } from "../../database/supabase";

const sendCodeVerify = async (email) => {
  console.log("Enviando email a verificar");
  // Chequeo de existencia pre-login (sin sesión). Multi-gym: el login autentica
  // a la PERSONA, no a un gym — el gym se elige después (ActiveGymProvider).
  // Con RLS activo en profiles no se puede leer la tabla directo desde anon:
  // usamos la RPC SECURITY DEFINER global.
  const { data: exists, error } = await supabase.rpc("email_exists", {
    p_email: email,
  });

  if (error) {
    console.error("Error al enviar:", error.message);
    throw error;
  }

  if (!exists) {
    throw new Error("Usuario no encontrado.");
  }

  const { data: dataOtp, error: errorOtp } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });

  if (errorOtp) {
    console.error("Error al enviar:", errorOtp.message);
    throw errorOtp;
  }

  return dataOtp;
};

export default sendCodeVerify;
