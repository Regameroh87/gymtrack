// Permite importar hojas de estilo globales por efecto secundario
// (p. ej. `import "./globals.css"`). Sin esta declaración, TS estricto con
// moduleResolution "bundler" reporta TS2882 al no encontrar tipos para el
// import. Los CSS Modules (`*.module.css`) ya los tipa Next por separado.
declare module "*.css";
