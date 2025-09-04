/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neobrutalist color palette
        brutal: {
          black: '#000000',
          white: '#FFFFFF',
          yellow: '#FFFF00',
          pink: '#FF00FF',
          cyan: '#00FFFF',
          lime: '#00FF00',
          orange: '#FF8000',
          red: '#FF0000',
          blue: '#0080FF',
        },
      },
      fontFamily: {
        mono: ['Courier New', 'monospace'],
        brutal: ['Arial Black', 'Helvetica', 'sans-serif'],
      },
      boxShadow: {
        brutal: '4px 4px 0px 0px #000000',
        'brutal-lg': '8px 8px 0px 0px #000000',
        'brutal-xl': '12px 12px 0px 0px #000000',
      },
      borderWidth: {
        3: '3px',
        4: '4px',
        5: '5px',
      },
    },
  },
  plugins: [],
}