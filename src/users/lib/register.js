import { supabase } from "../../database/supabase";

const registerUser = async (value) => {
  const { data, error } = await supabase.from("profiles").insert({
    email: value.email,
    name: value.name,
    last_name: value.last_name,
    image_profile: value.image_profile,
    phone: value.phone,
    document_number: value.document_number,
    address: value.address,
  });
  if (error) {
    console.error("Error al registrar:", error.message);
    throw error;
  }
  console.log(data);
  return data;
};

export default registerUser;
