const fs = require('fs');

const svg = `
<svg width="240" height="160" viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Infinity Loop (Controller Body) -->
  <!-- Left curve: centered at 60,80. Right curve: centered at 180,80 -->
  <path d="M 120 80 
           C 100 40, 70 30, 45 45 
           C 20 60, 20 100, 45 115 
           C 70 130, 100 120, 120 80
           C 140 40, 170 30, 195 45 
           C 220 60, 220 100, 195 115 
           C 170 130, 140 120, 120 80 Z" 
        stroke="#f97316" stroke-width="24" stroke-linejoin="round" fill="none"/>
  
  <!-- Left Grip -->
  <!-- Coming down from the left loop -->
  <path d="M 35 110 C 20 120, 25 150, 40 155 C 55 160, 70 140, 75 125" 
        stroke="#f97316" stroke-width="20" stroke-linecap="round" fill="none" />
        
  <!-- Right Grip -->
  <!-- Coming down from the right loop -->
  <path d="M 205 110 C 220 120, 215 150, 200 155 C 185 160, 170 140, 165 125" 
        stroke="#f97316" stroke-width="20" stroke-linecap="round" fill="none" />
  
  <!-- Left Joystick (Solid Circle) -->
  <circle cx="65" cy="80" r="14" fill="#f97316" />
  
  <!-- Right Action Buttons (4 Dots) -->
  <circle cx="175" cy="65" r="5" fill="#f97316" /> <!-- Top -->
  <circle cx="175" cy="95" r="5" fill="#f97316" /> <!-- Bottom -->
  <circle cx="160" cy="80" r="5" fill="#f97316" /> <!-- Left -->
  <circle cx="190" cy="80" r="5" fill="#f97316" /> <!-- Right -->
</svg>
`;

fs.writeFileSync('logo.svg', svg);
console.log('SVG created');
