export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        chalk: '#F7F5F0',
        ink: '#1B2420',
        ember: '#FF5A36',
        moss: '#3C5B43',
        steel: '#7C8B86',
        citrus: '#FFC94A'
      },
      fontFamily: {
        display: ['Archivo', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
