/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'brand-light': '#F8B195',  // Salmón claro
        'brand-coral': '#F67280',  // Coral
        'brand-plum': '#C06C84',   // Ciruela
        'brand-purple': '#6C5B7B', // Púrpura grisáceo
        'brand-dark': '#355C7D',   // Azul profundo
      }
    },
  },
  plugins: [],
}