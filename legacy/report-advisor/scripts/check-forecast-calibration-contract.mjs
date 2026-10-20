import fs from 'node:fs';
const s=fs.readFileSync('src/lib/intelligence/forecastCalibration.ts','utf8');
for(const token of ['calibrateForecast','mae','bias','coverage','meanConfidence','calibrated']) if(!s.includes(token)) throw new Error(`forecast calibration contract missing ${token}`);
console.log('forecast calibration contract: PASS');
