import { supabase } from "../../database/supabase";

const createMember = async ({ email, name, last_name, phone, document_number, address, image_profile, role = "member" }) => {
  const { data, error } = await supabase.functions.invoke("crear-socio", {
    body: {
      email,
      name,
      last_name,
      phone,
      document_number,
      address,
      image_profile,
      role,
    },
  });

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
};

export default createMember;
