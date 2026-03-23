export const uploadFileToCloudinary = async ({
  fileUri,
  uploadPreset,
  typeFile,
}) => {
  const cloudName = "ddupuyeko";

  const data = new FormData();
  const fileName = fileUri.split("/").pop();
  const extension = fileName.split(".").pop().toLowerCase();

  data.append("file", {
    uri: fileUri,
    type: `${typeFile}/${extension === "jpg" ? "jpeg" : extension}`,
    name: fileName,
  });

  data.append("upload_preset", uploadPreset);
  const URL = `https://api.cloudinary.com/v1_1/${cloudName}/${typeFile}/upload`;

  const response = await fetch(URL, {
    method: "POST",
    body: data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const result = await response.json();

  if (response.ok) {
    return { url: result.secure_url, public_id: result.public_id, result };
  } else {
    throw new Error(result.error?.message || "Error al subir a Cloudinary"); // Deberia hacer un rollback de la transaccion
  }
};
