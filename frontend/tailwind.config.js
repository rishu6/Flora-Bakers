/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bakery: {
          cream: "#f7f3ec",
          brown: "#5b3828",
          terracotta: "#c9795b",
          sage: "#71816a",
        },
      },
    },
  },
  plugins: [],
};
