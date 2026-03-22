export const isYouTube = (url) => {
  if (!url) return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
};

export const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp =
    /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return match[2];
  }
  return null;
};
