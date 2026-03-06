import { supabase } from "../../database/supabase";

const ERROR_MESSAGES = {
  23505: "Este correo o número de documento ya se encuentra registrado.",
  23502: "Faltan datos obligatorios para el registro.",
  42501: "Error de permisos. Verifica tu sesión.",
  default: "Ocurrió un error inesperado. Inténtalo de nuevo.",
};

const registerUser = async (value) => {
  const { error } = await supabase.from("profiles").insert({
    email: value.email,
    name: value.name,
    last_name: value.last_name,
    image_profile: value.image_profile,
    phone: value.phone,
    document_number: value.document_number,
    address: value.address,
  });
  if (error) {
    // Buscamos el código en nuestro diccionario, si no existe usamos el default
    const translateError = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.default;
    // Lanzamos un error con el mensaje amigable
    throw new Error(translateError);
  }
  return;
};

export default registerUser;
