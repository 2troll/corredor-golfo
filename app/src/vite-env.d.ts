/// <reference types="vite/client" />
// Los shaders GLSL se importan como texto con el sufijo ?raw.
declare module '*.glsl?raw' { const codigo: string; export default codigo }
