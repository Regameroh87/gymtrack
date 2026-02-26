import { supabase } from "../../database/supabase";
const sendCodeVerify = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email: email,
    options: {
      shouldCreateUser: false,
    },
  });
  if (error) {
    console.error("Error al enviar:", error.message);
    throw error;
  }
};

export default sendCodeVerify;
