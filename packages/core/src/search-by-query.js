export const searchByQuery = ({ query, options, tag }) => {
  if (!options || !tag) return;
  if (!query) return options;
  const filtered = options.filter((opt) =>
    tag
      ? opt[tag].toLowerCase().includes(query.toLowerCase())
      : opt.toLowerCase().includes(query.toLowerCase())
  );
  return filtered;
};
