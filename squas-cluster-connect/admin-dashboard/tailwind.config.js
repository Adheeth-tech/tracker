/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        gray: {
          150: "#e7eaf0",
        },
        indigo: {
          650: "#4f46e5",
          750: "#3730a3",
        },
        slate: {
          850: "#172033",
        },
      }
    },
  },
  plugins: [],
}
