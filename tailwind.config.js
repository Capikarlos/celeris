/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        celeris: {
          dark: '#1B315E',  // Azul oscuro del logo
          main: '#0056D2',  // Azul brillante
          light: '#22D3EE', // Turquesa/Cian
          bg: '#F8FAFC',    // Fondo gris muy claro
        }
      },
    },
  },
  plugins: [],
}