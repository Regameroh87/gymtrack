import { supabase } from "../../database/supabase";
const sendCodeVerify = async (email) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("email", email);
  if (data) {
    const { data: dataOtp, error: errorOtp } =
      await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        },
      });
    if (errorOtp) {
      console.error("Error al enviar:", errorOtp.message);
      throw errorOtp;
    }
    return dataOtp;
  }

  if (error) {
    console.error("Error al enviar:", error.message);
    throw error;
  }
  console.log(data);
  return data;
};

export default sendCodeVerify;
