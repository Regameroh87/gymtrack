export const uploadToCloudinary = async (fileUri) => {
  const cloudName = "ddupuyeko"; // El que ves en tu Dashboard
  const uploadPreset = "gymtrack_images"; // El que creaste como "Unsigned"

  // 1. Preparamos el FormData (formato que entiende el servidor)
  const data = new FormData();
  const fileName = fileUri.split("/").pop();
  const extension = fileName.split(".").pop().toLowerCase();

  data.append("file", {
    uri: fileUri,
    type: `image/${extension === "jpg" ? "jpeg" : extension}`, // Opcional: puedes detectar el tipo, pero jpeg suele funcionar
    name: fileName,
  });

  data.append("upload_preset", uploadPreset);

  // 2. Hacemos la petición POST a Cloudinary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: data,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  const result = await response.json();

  if (response.ok) {
    return result.secure_url; // Esta es la URL de internet (https://...)
  } else {
    throw new Error(result.error?.message || "Error al subir a Cloudinary");
  }
};

export const deleteVideoFromCloudinary = async (videoUrl) => {
  const cloudName = "ddupuyeko";
  const apiKey = "PONER_TU_API_KEY"; // Tu API Key de Cloudinary
  const apiSecret = "PONER_TU_API_SECRET"; // Tu API Secret para firmar
  const timestamp = Math.round(new Date().getTime() / 1000);
  // 1. Extraemos el public_id de la URL
  const parts = videoUrl.split("/");
  const uploadIndex = parts.indexOf("upload");
  const publicId = parts
    .slice(uploadIndex + 2)
    .join("/")
    .split(".")[0];
  // 2. Preparamos los datos para la petición
  const formData = new FormData();
  formData.append("public_id", publicId);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  // formData.append("signature", signature); // Aquí va la firma SHA-1
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`,
      {
        method: "POST",
        body: formData,
      }
    );
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error al borrar:", error);
    throw error;
  }
};
