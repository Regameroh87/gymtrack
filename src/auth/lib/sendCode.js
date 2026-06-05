import { supabase } from "../../database/supabase";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

const sendCodeVerify = async (email) => {
  console.log("Enviando email a verificar");
  // Chequeo de existencia pre-login (sin sesión). Con RLS activo en profiles ya
  // no se puede leer la tabla directo desde anon: usamos la RPC SECURITY DEFINER.
  const { data: exists, error } = await supabase.rpc("email_exists_in_gym", {
    p_email: email,
    p_gym_id: GYM_ID,
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
