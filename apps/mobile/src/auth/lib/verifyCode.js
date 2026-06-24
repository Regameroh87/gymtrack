import { supabase } from "../../database/supabase";
const handleVerifyCode = async ({ email, code }) => {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });

  if (error) {
    throw error;
  }

  return data;
};

export default handleVerifyCode;
