// Run: node docs/05-design/refresh/check-ui-contrast.mjs (ROADMAP 3X.2). Button, canvas and hero gradient contrast.
import { contrast } from './derive-category-color.mjs';
const rows = [
 // [label, text, [backgrounds...], min]
 ['L primary btn white on brand.600→700', '#FFFFFF', ['#29807E','#0D696C'], 4.5],
 ['L primary hover white on brand.700→800', '#FFFFFF', ['#0D696C','#08565A'], 4.5],
 ['L secondary btn neutral.900 on white→neutral.100', '#1E1E21', ['#FFFFFF','#F4F4F5'], 4.5],
 ['L secondary border neutral.450 vs white', '#8A8A93', ['#FFFFFF'], 3],
 ['L accent btn neutral.950 on orange.300→400', '#161616', ['#F9A76E','#F48438'], 4.5],
 ['L danger btn white on red.600→700', '#FFFFFF', ['#DC2626','#B91C1C'], 4.5],
 ['L focus ring brand.600 vs canvas stops', '#29807E', ['#FFFFFF','#F3F8F8','#F5F3FA'], 3],
 ['D primary btn neutral.950 on brand.400→500', '#161616', ['#52B3B0','#35A29F'], 4.5],
 ['D secondary btn neutral.100 on neutral.750→800', '#F4F4F5', ['#36363B','#2E2E33'], 4.5],
 ['D accent btn neutral.950 on orange.300→400', '#161616', ['#F9A76E','#F48438'], 4.5],
 ['D danger btn neutral.950 on red.400→500', '#161616', ['#F87171','#EF4444'], 4.5],
 // page canvas: worst-case composited stops
 ['L canvas text.primary', '#1E1E21', ['#FAFAFA','#F3F8F8','#F5F3FA','#F4F5F7'], 4.5],
 ['L canvas text.secondary', '#52525B', ['#FAFAFA','#F3F8F8','#F5F3FA','#F4F5F7'], 4.5],
 ['L canvas text.muted', '#6B6B74', ['#FAFAFA','#F3F8F8','#F5F3FA','#F4F5F7'], 4.5],
 ['L canvas text.link brand.700', '#0D696C', ['#FAFAFA','#F3F8F8','#F5F3FA','#F4F5F7'], 4.5],
 ['D canvas text.primary', '#F4F4F5', ['#161616','#14201F','#1B1825','#111214'], 4.5],
 ['D canvas text.muted', '#A1A1AA', ['#161616','#14201F','#1B1825','#111214'], 4.5],
 ['D canvas text.link brand.300', '#7FCAC7', ['#161616','#14201F','#1B1825','#111214'], 4.5],
 ['L hero white on brand.600→brand.800 (+violet end)', '#FFFFFF', ['#29807E','#0D696C','#08565A','#3B3E8F'], 4.5],
 ['D hero white on brand.800→brand.950', '#FFFFFF', ['#08565A','#024249','#012C31','#26285E'], 4.5],
];
let bad=0;
for (const [l,t,bgs,min] of rows){const v=Math.min(...bgs.map(b=>contrast(t,b)));if(v<min)bad++;console.log((v>=min?'pass':'FAIL').padEnd(5),v.toFixed(2).padStart(6),'≥',min,l);}
console.log('failures',bad);
