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
