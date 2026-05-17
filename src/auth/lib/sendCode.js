import { supabase } from "../../database/supabase";

const GYM_ID = process.env.EXPO_PUBLIC_GYM_ID;

const sendCodeVerify = async (email) => {
  console.log("Enviando email a verificar");
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .eq("gym_id", GYM_ID);

  if (error) {
    console.error("Error al enviar:", error.message);
    throw error;
  }

  if (!data || data.length === 0) {
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
